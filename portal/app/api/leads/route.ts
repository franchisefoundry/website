import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreMatch } from '@/lib/matching'
import { sendLeadNotificationToTeam, sendLeadConfirmationToFranchisee } from '@/lib/email'
import { notifyAdmins, notify } from '@/lib/notifications'
import { resolveReferral } from '@/lib/referral'
import type { FranchiseeProfile, FranchisorProfile } from '@/lib/supabase/types'

// Simple email format check (server-side, belt-and-braces)
function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// Allowed values for enum fields — prevents garbage data in the database
const ALLOWED_OPERATOR_MODELS = new Set(['owner-operator', 'hire-manager', 'either'])
const ALLOWED_EXPERIENCES     = new Set(['none', 'some', 'experienced'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      full_name, email, phone,
      investment_min, investment_max, liquid_capital,
      preferred_locations, operator_model, experience,
      full_time_available, multi_site_interest, timeline_months,
      sectors, format_types, goals,
    } = body

    // ── Required field validation ──────────────────────────────────────────────
    const nameClean = typeof full_name === 'string' ? full_name.trim() : ''
    const emailClean = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const phoneClean = typeof phone === 'string' ? phone.trim() : ''

    if (!nameClean) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    if (nameClean.length > 200) return NextResponse.json({ error: 'Name is too long.' }, { status: 400 })
    if (!emailClean) return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })
    if (!isValidEmail(emailClean)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    if (!phoneClean) return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 })
    if (phoneClean.length > 30) return NextResponse.json({ error: 'Phone number is too long.' }, { status: 400 })

    // ── Sanitise enum fields — reject unexpected values ────────────────────────
    const safeOperatorModel = ALLOWED_OPERATOR_MODELS.has(operator_model) ? operator_model : null
    const safeExperience    = ALLOWED_EXPERIENCES.has(experience) ? experience : null

    // ── Sanitise free-text goal field ──────────────────────────────────────────
    const safeGoals = typeof goals === 'string' ? goals.slice(0, 2000) : null

    const supabase = createAdminClient()

    // Resolve an agent referral from the ff_ref cookie (set by middleware when the
    // visitor arrived via an agent's link). null if absent/invalid.
    const introducerId = await resolveReferral(supabase, request.cookies.get('ff_ref')?.value)

    // Save the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        full_name:            nameClean,
        email:                emailClean,
        phone:                phoneClean,
        investment_min:       typeof investment_min === 'number' ? investment_min : null,
        investment_max:       typeof investment_max === 'number' ? investment_max : null,
        liquid_capital:       typeof liquid_capital === 'number' ? liquid_capital : null,
        preferred_locations:  Array.isArray(preferred_locations) ? preferred_locations : [],
        operator_model:       safeOperatorModel,
        experience:           safeExperience,
        full_time_available:  typeof full_time_available === 'boolean' ? full_time_available : true,
        multi_site_interest:  typeof multi_site_interest === 'boolean' ? multi_site_interest : false,
        timeline_months:      typeof timeline_months === 'number' ? timeline_months : null,
        sectors:              Array.isArray(sectors) && sectors.length ? sectors : ['food-beverage'],
        format_types:         Array.isArray(format_types) ? format_types : [],
        goals:                safeGoals,
        status:               'meeting_requested',
        introducer_id:        introducerId,
        source:               introducerId ? 'agent_referral' : 'matching_platform',
      })
      .select('id')
      .single()

    if (leadError || !lead) {
      console.error('Lead insert error:', leadError)
      // Do NOT return the raw DB error — it may contain table/column names
      return NextResponse.json({ error: 'Could not save your details. Please try again.' }, { status: 500 })
    }

    // Load active franchisors and compute matches
    const { data: franchisors } = await supabase
      .from('franchisor_profiles')
      .select('*')
      .eq('status', 'active')

    let matchCount = 0

    if (franchisors?.length) {
      const pseudoFranchisee: FranchiseeProfile = {
        id: lead.id,
        user_id: lead.id,
        investment_min: investment_min ?? null,
        investment_max: investment_max ?? null,
        liquid_capital: liquid_capital ?? null,
        preferred_locations: preferred_locations ?? [],
        operator_model: operator_model ?? null,
        experience: experience ?? null,
        full_time_available: full_time_available ?? true,
        multi_site_interest: multi_site_interest ?? false,
        timeline_months: timeline_months ?? null,
        sectors: sectors ?? [],
        format_types: format_types ?? [],
        goals: goals ?? null,
        status: 'active',
        tier_2_unlocked: false,
        invited_at: null,
        activated_at: null,
        signed_at: null,
        assigned_admin: null,
        meeting_notes: null,
        internal_rating: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const matchRows: { lead_id: string; franchisor_id: string; score: number }[] = []

      for (const franchisor of franchisors as FranchisorProfile[]) {
        const score = scoreMatch(pseudoFranchisee, franchisor)
        if (score > 0) {
          matchRows.push({ lead_id: lead.id, franchisor_id: franchisor.id, score })
        }
      }

      matchCount = matchRows.length

      if (matchRows.length > 0) {
        await supabase.from('lead_matches').insert(matchRows)
      }
    }

    // Agent referral: surface the lead in the agent's CRM (read-only, attributed)
    // and notify them. The FF team drives conversion via the main leads pipeline.
    if (introducerId) {
      const [firstName, ...rest] = nameClean.split(' ')
      await supabase.from('introducer_leads').insert({
        introducer_id:       introducerId,
        first_name:          firstName || nameClean,
        last_name:           rest.join(' ') || null,
        email:               emailClean,
        phone:               phoneClean || null,
        location:            Array.isArray(preferred_locations) && preferred_locations.length
                               ? preferred_locations.join(', ') : null,
        investment_min:      typeof investment_min === 'number' ? investment_min : null,
        investment_max:      typeof investment_max === 'number' ? investment_max : null,
        liquid_capital:      typeof liquid_capital === 'number' ? liquid_capital : null,
        operator_model:      safeOperatorModel,
        experience:          safeExperience,
        full_time_available: typeof full_time_available === 'boolean' ? full_time_available : null,
        timeline_months:     typeof timeline_months === 'number' ? timeline_months : null,
        sectors:             Array.isArray(sectors) && sectors.length ? sectors : null,
        goals:               safeGoals,
        source:              'referral_link',
        relationship:        'Referral link',
        introducer_notes:    'Came through your unique referral link. The Franchise Foundry team is handling this lead.',
        status:              'submitted',
      })

      await notify({
        userId: introducerId,
        event:  'referral_lead',
        title:  'New referral lead',
        body:   `${nameClean} joined the matching platform via your referral link.`,
        link:   '/introducer/leads',
      })
    }

    // Send emails — await both so the serverless function doesn't terminate
    // before Resend has accepted them. Failures are logged but don't affect
    // the response to the user.
    const emailResults = await Promise.allSettled([
      sendLeadNotificationToTeam({
        leadId: lead.id,
        fullName: nameClean,
        email: emailClean,
        phone: phoneClean,
        investmentMin: typeof investment_min === 'number' ? investment_min : null,
        investmentMax: typeof investment_max === 'number' ? investment_max : null,
        operatorModel: safeOperatorModel,
        timelineMonths: typeof timeline_months === 'number' ? timeline_months : null,
        matchCount,
      }),
      sendLeadConfirmationToFranchisee({
        fullName: nameClean,
        email: emailClean,
      }),
    ])
    emailResults.forEach((r, i) => {
      if (r.status === 'rejected') console.error(`Email ${i} failed:`, r.reason)
    })

    // In-app alert for every admin (+ optional personal email per their preference).
    // The team inbox is always emailed above; this adds the bell notification.
    await notifyAdmins({
      type: 'new_lead',
      title: `New lead — ${nameClean}`,
      body: `${matchCount} match${matchCount === 1 ? '' : 'es'} found. Tap to review.`,
      link: `/admin/leads/${lead.id}`,
    })

    return NextResponse.json({ id: lead.id })

  } catch (err) {
    console.error('Leads API error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
