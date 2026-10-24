/**
 * Partner applications: Become a partner (website) → vetting checklist
 * (admin) → approve creates the partner, decline closes it politely.
 * Nothing here is public: the apply route writes, admin reads and moves.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { NEEDS, NEED_LABEL, REGION_LABEL, type Need, type Region } from './taxonomy.ts'
import { cleanText } from './validate'
import { escapeHtml } from './brief.ts'
import { sendEmail } from '@/lib/email/resend'
import { notifyFoundryTeam } from './notify'

export const BUCKET = 'partner-applications'

export { CHECKS, TRUST_LEVELS, APPLY_REGIONS, type CheckKey, type TrustLevel } from './applications-shared.ts'
import { APPLY_REGIONS, slugify, type CheckKey, type TrustLevel } from './applications-shared.ts'

const MAX_FILE = 3 * 1024 * 1024 // base64 in JSON must stay under Netlify's 6MB body limit
const FILE_TYPES: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Demo rows never email the applicant: they go to the preview list instead. */
async function mail(to: string, subject: string, html: string, demo: boolean) {
  if (!demo) return sendEmail({ to, subject, html })
  const list = (process.env.FOUNDRY_PREVIEW_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  for (const r of list) await sendEmail({ to: r, subject: `[Demo → ${to}] ${subject}`, html })
}

function normaliseUrl(v: string | null): string | null {
  if (!v) return null
  const t = /^https?:\/\//i.test(v) ? v : `https://${v}`
  try { const u = new URL(t); return u.hostname.includes('.') ? u.toString().replace(/\/$/, '') : null } catch { return null }
}

// ── Apply (public) ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createApplication(admin: SupabaseClient, body: any, { demo }: { demo: boolean }): Promise<{ ok: true; email: string } | { error: string }> {
  const company = cleanText(body?.company, 160)
  const name = cleanText(body?.name, 120)
  const email = cleanText(body?.email, 200)?.toLowerCase() ?? null
  const category = NEEDS.includes(body?.category) ? body.category as Need : null
  if (!company) return { error: 'Please add your company name.' }
  if (!category) return { error: 'Pick what you do.' }
  if (!name) return { error: 'Please add your name.' }
  if (!email || !EMAIL.test(email)) return { error: 'Please enter a valid email address.' }
  const website = cleanText(body?.website, 300)
  const site = normaliseUrl(website)
  if (website && !site) return { error: 'That website doesn’t look right.' }
  const regions = Array.isArray(body?.regions)
    ? [...new Set((body.regions as unknown[]).filter((r): r is string => typeof r === 'string' && APPLY_REGIONS.some(([k]) => k === r)))]
    : []
  if (!regions.length) return { error: 'Tell us where you work.' }
  const refs = cleanText(body?.references, 1500)
  if (!refs) return { error: 'Add three franchise clients we can call.' }
  if (body?.consent !== true) return { error: 'Please confirm we can run these checks.' }
  const clientsRaw = Number(body?.clients)
  const clients = Number.isFinite(clientsRaw) && clientsRaw >= 0 ? Math.min(Math.round(clientsRaw), 10_000) : null

  // Light abuse guard: three applications per email per day.
  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await admin.from('partner_applications').select('id', { count: 'exact', head: true })
    .eq('contact_email', email).gte('created_at', since)
  if ((count ?? 0) >= 3) return { error: 'We’ve already got your application. We’ll be in touch within 3 working days.' }

  // Insurance certificate: optional data URL, PDF or image, max 3MB.
  let insurancePath: string | null = null
  const file = body?.insurance
  if (file && typeof file.data === 'string') {
    const type = String(file.type ?? '')
    const ext = FILE_TYPES[type]
    if (!ext) return { error: 'Insurance certificate must be a PDF or an image.' }
    const raw = file.data.replace(/^data:[^;]+;base64,/, '')
    const buf = Buffer.from(raw, 'base64')
    if (!buf.length || buf.length > MAX_FILE) return { error: 'Insurance certificate must be under 3MB.' }
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`
    const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: type })
    if (error) { console.error('[apply] upload failed', error.message); return { error: 'Could not upload that file. Try a smaller one, or send it later.' } }
    insurancePath = path
  }

  const { data: app, error } = await admin.from('partner_applications').insert({
    company_name: company, website: site, companies_house: cleanText(body?.companiesHouse, 20), regulator_no: cleanText(body?.regulator, 40),
    category, regions, clients_2y: clients, references_text: refs, insurance_path: insurancePath, deal: cleanText(body?.deal, 300),
    contact_name: name, contact_email: email, contact_phone: cleanText(body?.phone, 40), contact_role: cleanText(body?.role, 80), is_demo: demo,
  }).select('id').single()
  if (error || !app) { console.error('[apply] insert failed', error?.message); return { error: 'Could not send that. Try again.' } }

  await Promise.all([
    mail(email, 'We’ve got your application', applicantHtml(name, `
<p style="margin:0 0 12px;">Thanks for applying to be a Foundry partner. Here’s what happens next:</p>
<ol style="margin:0 0 12px;padding-left:20px;">
<li>We check the basics: Companies House, insurance, and FCA or SRA where it applies.</li>
<li>We call three of your franchise clients.</li>
<li>A call with the founders.</li>
<li>We build your profile with you and agree your member deal.</li>
</ol>
<p style="margin:0;">We’ll reply within 3 working days.</p>`), demo).catch(e => console.error('[apply] applicant email failed', e)),
    notifyFoundryTeam({
      event: 'partner_application', title: `New partner application: ${company}`,
      body: `${NEED_LABEL[category]} · ${regions.map(r => APPLY_REGIONS.find(([k]) => k === r)?.[1]).join(', ')}`,
      link: `/admin/foundry/applications?id=${app.id}`,
    }, { demo }).catch(e => console.error('[apply] notify failed', e)),
  ])
  return { ok: true, email }
}

/** `name: false` skips the greeting (the decline note writes its own). */
function applicantHtml(name: string | null | false, inner: string) {
  const hi = name === false ? '' : name ? `Hi ${escapeHtml(name.split(' ')[0])},` : 'Hi,'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1b211a;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#3a4a3a;padding:20px 32px;"><span style="font-size:16px;font-weight:700;color:#ffffff;">The Foundry</span><span style="font-size:12px;color:#c9d3ca;"> by Franchise Foundry</span></td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6;">${hi ? `<p style="margin:0 0 12px;">${hi}</p>` : ''}${inner}</td></tr>
</table></td></tr></table></body></html>`
}

// ── Admin: load ────────────────────────────────────────────────────────────

export interface ApplicationCard {
  id: string
  company: string
  website: string | null
  companiesHouse: string | null
  regulator: string | null
  category: Need
  categoryLabel: string
  regions: string[]
  regionLabel: string
  clients: number | null
  references: string | null
  insuranceUrl: string | null
  deal: string | null
  contact: { name: string; email: string; phone: string | null; role: string | null }
  status: 'new' | 'vetting' | 'approved' | 'declined'
  checks: Partial<Record<CheckKey, boolean>>
  referencesCalled: number
  trust: TrustLevel
  notes: string | null
  partner: { id: string; slug: string; status: string } | null
  isDemo: boolean
  createdAt: string
  /** Unanswered searches in this category over the last 30 days. */
  gap: { searches: number; area: string | null } | null
}

export function regionLabel(regions: string[]): string {
  if (regions.includes('uk')) return 'UK-wide'
  return regions.map(r => REGION_LABEL[r as Region] ?? r).join(', ') || 'Not given'
}

export async function loadApplications(admin: SupabaseClient, { includeDemo, view }: { includeDemo: boolean; view: 'open' | 'decided' }): Promise<ApplicationCard[]> {
  let q = admin.from('partner_applications').select('*, partners(id, slug, status)')
    .in('status', view === 'open' ? ['new', 'vetting'] : ['approved', 'declined'])
    .order('created_at', { ascending: view === 'open' })
    .limit(200)
  if (!includeDemo) q = q.eq('is_demo', false)
  const { data: rows, error } = await q
  if (error) throw new Error(`loadApplications: ${error.message}`)
  if (!rows?.length) return []

  // Gap hints: what members searched for in this category that we couldn't answer.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  let gq = admin.from('search_events').select('unmet_needs, parsed').gte('created_at', since).neq('unmet_needs', '{}').limit(5000)
  if (!includeDemo) gq = gq.eq('is_demo', false)
  const { data: gaps } = await gq
  const gapFor = (need: string) => {
    const hits = (gaps ?? []).filter(g => (g.unmet_needs as string[]).includes(need))
    if (!hits.length) return null
    const areas = new Map<string, number>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const h of hits) { const a = (h.parsed as any)?.area?.label; if (a) areas.set(a, (areas.get(a) ?? 0) + 1) }
    const top = [...areas.entries()].sort((a, b) => b[1] - a[1])[0]
    return { searches: hits.length, area: top?.[0] ?? null }
  }

  const signed = await Promise.all(rows.map(r => r.insurance_path
    ? admin.storage.from(BUCKET).createSignedUrl(r.insurance_path, 3600).then(x => x.data?.signedUrl ?? null)
    : Promise.resolve(null)))

  return rows.map((r, i) => ({
    id: r.id,
    company: r.company_name,
    website: r.website,
    companiesHouse: r.companies_house,
    regulator: r.regulator_no,
    category: r.category as Need,
    categoryLabel: NEED_LABEL[r.category as Need] ?? r.category,
    regions: r.regions ?? [],
    regionLabel: regionLabel(r.regions ?? []),
    clients: r.clients_2y,
    references: r.references_text,
    insuranceUrl: signed[i],
    deal: r.deal,
    contact: { name: r.contact_name, email: r.contact_email, phone: r.contact_phone, role: r.contact_role },
    status: r.status,
    checks: (r.checks ?? {}) as ApplicationCard['checks'],
    referencesCalled: r.references_called ?? 0,
    trust: r.trust_level as TrustLevel,
    notes: r.notes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    partner: (r as any).partners ? { id: (r as any).partners.id, slug: (r as any).partners.slug, status: (r as any).partners.status } : null,
    isDemo: r.is_demo,
    createdAt: r.created_at,
    gap: gapFor(r.category),
  }))
}

// ── Admin: moves ───────────────────────────────────────────────────────────

export type ApplicationAction =
  | { action: 'check'; key: CheckKey; on: boolean }
  | { action: 'refs'; called: number }
  | { action: 'trust'; level: TrustLevel }
  | { action: 'notes'; body: string }
  | { action: 'approve' }
  | { action: 'decline'; message: string | null }

async function freeSlug(admin: SupabaseClient, base: string) {
  const { data } = await admin.from('partners').select('slug').like('slug', `${base}%`)
  const taken = new Set((data ?? []).map(d => d.slug))
  if (!taken.has(base)) return base
  for (let n = 2; n < 500; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`
  return `${base}-${Date.now().toString(36)}`
}

export async function performApplicationAction(
  admin: SupabaseClient, id: string, act: ApplicationAction, actor: { id: string | null; name: string },
): Promise<{ ok: true; partnerId?: string; live?: boolean } | { error: string }> {
  const { data: a } = await admin.from('partner_applications').select('*').eq('id', id).maybeSingle()
  if (!a) return { error: 'Application not found.' }
  const open = a.status === 'new' || a.status === 'vetting'
  const iso = new Date().toISOString()
  const update = (patch: Record<string, unknown>) =>
    admin.from('partner_applications').update({ ...patch, status: open ? 'vetting' : a.status, updated_at: iso }).eq('id', id)

  switch (act.action) {
    case 'check': {
      if (!open) return { error: 'This application is already decided.' }
      await update({ checks: { ...(a.checks ?? {}), [act.key]: act.on } })
      return { ok: true }
    }
    case 'refs': {
      if (!open) return { error: 'This application is already decided.' }
      const n = Math.max(0, Math.min(3, Math.round(act.called)))
      await update({ references_called: n, checks: { ...(a.checks ?? {}), ref: n >= 3 } })
      return { ok: true }
    }
    case 'trust': {
      await update({ trust_level: act.level })
      if (a.partner_id) await admin.from('partners').update({ trust_level: act.level }).eq('id', a.partner_id)
      return { ok: true }
    }
    case 'notes': {
      await update({ notes: act.body.trim().slice(0, 4000) || null })
      return { ok: true }
    }
    case 'approve': {
      if (!open) return { error: 'This application is already decided.' }
      // Always a draft: an application has no profile copy yet. Admin finishes it
      // in the partner editor and switches it live there.
      const live = false
      const slug = await freeSlug(admin, slugify(a.company_name))
      const { data: p, error } = await admin.from('partners').insert({
        name: a.company_name, slug, category: a.category, website: a.website, offer_text: a.deal,
        regions: a.regions ?? [], client_count: a.clients_2y, trust_level: a.trust_level,
        status: live ? 'live' : 'draft', is_active: live, is_demo: a.is_demo,
      }).select('id').single()
      if (error || !p) { console.error('[applications] partner insert failed', error?.message); return { error: 'Could not create the partner.' } }
      await admin.from('partner_contacts').insert({
        partner_id: p.id, name: a.contact_name, email: a.contact_email, phone: a.contact_phone, role: a.contact_role, is_primary: true,
      })
      await admin.from('partner_applications').update({
        status: 'approved', partner_id: p.id, decided_at: iso, decided_by: actor.id, updated_at: iso,
      }).eq('id', id)
      await mail(a.contact_email, live ? 'You’re live on The Foundry' : 'You’re approved for The Foundry',
        applicantHtml(a.contact_name, live
          ? `<p style="margin:0 0 12px;">Good news: ${escapeHtml(a.company_name)} is now live on The Foundry.</p><p style="margin:0;">When a franchisee asks for an intro, we’ll brief you first by email: what they’re opening, where, their budget and what they need.</p>`
          : `<p style="margin:0 0 12px;">Good news: we’d like ${escapeHtml(a.company_name)} on The Foundry.</p><p style="margin:0;">Next we’ll build your profile with you and agree your member deal. We’ll be in touch to set that up.</p>`), a.is_demo).catch(e => console.error('[applications] approve email failed', e))
      return { ok: true, partnerId: p.id, live }
    }
    case 'decline': {
      if (!open) return { error: 'This application is already decided.' }
      await admin.from('partner_applications').update({ status: 'declined', decided_at: iso, decided_by: actor.id, updated_at: iso }).eq('id', id)
      if (act.message) {
        await mail(a.contact_email, 'Your Foundry application',
          applicantHtml(false, act.message.split(/\n{2,}/).map(p => `<p style="margin:0 0 12px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')), a.is_demo).catch(e => console.error('[applications] decline email failed', e))
      }
      return { ok: true }
    }
  }
}

export function declineDraft(company: string, name: string, sender: string) {
  return `Thanks for applying to The Foundry with ${company}, and for the time you put into it.

We keep a small number of partners in each category so every intro goes somewhere we’d send our own franchisees. We’re not going to take this one forward right now.

That can change as we grow into new areas. If it’s alright with you, we’ll keep your details on file and come back to you.

${sender}
Franchise Foundry`.replace(/^Thanks/, `Hi ${name.split(' ')[0]},\n\nThanks`)
}
