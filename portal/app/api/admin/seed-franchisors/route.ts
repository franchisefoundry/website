import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BRANDS = [
  {
    brand_name: 'Zendöner',
    slug: 'zen-doner',
    category: 'Fast Casual Döner',
    teaser: 'A technology-driven fast casual döner brand using automated kitchen systems to deliver consistent premium quality at scale — no food experience required.',
    investment_min: 216000,
    investment_max: 259000,
    investment_display: '£216,000 – £259,000',
    timeline_months: 3,
    highlights: [
      'Automated kitchen tech — consistent premium product, no food experience needed',
      'Semi-absentee model: operated by an approved GM, not hands-on',
      '18-month break-even target | €40,000 franchise fee (approx. £34,500) | 7% royalty, no hidden fees',
    ],
    operator_model: 'hire-manager',
    experience_required: 'none',
    format: ['dine-in', 'takeaway'],
    full_time_required: false,
    multi_site_ready: true,
    locations_available: [],
    locations_display: 'International',
    sectors: ['food-beverage'],
  },
  {
    brand_name: 'Zambrero',
    slug: 'zambrero',
    category: 'Mexican Fusion',
    teaser: 'A fresh, healthy Mexican fusion concept with a powerful social mission — for every meal sold, one is donated to someone in need. Fully standardised operations mean no prior food experience is required.',
    investment_min: 150000,
    investment_max: 350000,
    investment_display: '£150,000 – £350,000',
    timeline_months: 6,
    highlights: [
      'Powerful social mission — every meal sold donates a meal to someone in need',
      'No prior food experience needed — fully standardised operations',
      'Pioneer opportunity: 4–6 sites available in Greater Manchester & West Yorkshire',
    ],
    operator_model: 'owner-operator',
    experience_required: 'none',
    format: ['dine-in', 'takeaway'],
    full_time_required: true,
    multi_site_ready: true,
    locations_available: ['manchester', 'leeds'],
    locations_display: 'Greater Manchester & West Yorkshire',
    sectors: ['food-beverage'],
  },
  {
    brand_name: 'Oakberry',
    slug: 'oakberry',
    category: 'Quick Service (Açaí)',
    teaser: 'A premium açaí brand with a vertically integrated supply chain and simple, high-margin store operations across dine-in, takeaway, and kiosk formats — no complex supplier management required.',
    investment_min: 150000,
    investment_max: 210000,
    investment_display: '£150,000 – £210,000',
    timeline_months: 4,
    highlights: [
      'Premium açaí brand — centralised supply chain, simple day-to-day operations',
      'High-margin model: 70% in-store, 30% delivery | 6% royalty + 2% marketing',
      '2-year break-even target | Priority sites in London & Manchester',
    ],
    operator_model: 'either',
    experience_required: 'management',
    format: ['dine-in', 'takeaway', 'kiosk'],
    full_time_required: false,
    multi_site_ready: false,
    locations_available: ['london', 'manchester'],
    locations_display: 'London & Manchester',
    sectors: ['food-beverage', 'health-fitness'],
  },
  {
    brand_name: 'Paradice',
    slug: 'paradice',
    category: 'Artisanal Gelato & Coffee',
    teaser: 'A premium handmade gelato and artisan coffee concept blending Italian tradition with a modern British identity. Available as a kiosk or full café format, with centralised gelato supply keeping quality consistent across all sites — no hospitality experience required.',
    investment_min: 115000,
    investment_max: 165000,
    investment_display: '£115,000 – £165,000',
    timeline_months: 3,
    highlights: [
      'Kiosk or full café format — flexible entry point with centralised gelato supply',
      '£15,000 franchise fee | 5% royalty + 1% marketing | full training & ops manuals provided',
      'Target locations across London & Surrey — mock P&L and site list available',
    ],
    operator_model: 'hire-manager',
    experience_required: 'management',
    format: ['dine-in', 'kiosk'],
    full_time_required: false,
    multi_site_ready: true,
    locations_available: ['london'],
    locations_display: 'London & Surrey',
    sectors: ['food-beverage'],
  },
  {
    brand_name: 'T4',
    slug: 't4-uk-franchise',
    category: 'Coffee & Beverages (Bubble Tea)',
    teaser: 'A specialist bubble tea brand with a proven in-store model, flexible site formats, and a low-overhead, sales-focused operation — ideal for hands-on owner-operators ready to grow a high-footfall café concept across the UK.',
    investment_min: 150000,
    investment_max: 150000,
    investment_display: 'From £150,000',
    timeline_months: 6,
    highlights: [
      'Bubble tea specialist with flexible formats: dine-in, takeaway, and kiosk',
      'Simple sales-only model — no franchisor staff or rent obligations | 4% monthly royalty',
      'Owner-operator model: hands-on franchisees, long-term growth ambition required',
    ],
    operator_model: 'owner-operator',
    experience_required: 'none',
    format: ['dine-in', 'takeaway', 'kiosk'],
    full_time_required: true,
    multi_site_ready: false,
    locations_available: ['london', 'manchester', 'birmingham', 'leeds', 'bristol', 'edinburgh', 'glasgow', 'liverpool', 'sheffield', 'nottingham'],
    locations_display: 'UK-wide',
    sectors: ['food-beverage'],
  },
  {
    brand_name: 'Sides',
    slug: 'sides',
    category: 'Quick Service (Fried Chicken)',
    teaser: 'A high-growth, culturally powered QSR franchise built around 100% British Red Tractor-assured hot chicken — backed by one of the UK\'s biggest social media creator groups, converting a massive and highly engaged digital following into sustained in-store demand.',
    investment_min: 150000,
    investment_max: 300000,
    investment_display: '£150,000 – £300,000',
    timeline_months: 6,
    highlights: [
      '100% British Red Tractor hot chicken — unrivalled brand heat and cultural relevance in UK QSR',
      '£150k–£300k investment | 6% royalty + 3% marketing | semi-absentee permitted with approved GM',
      'Multi-unit growth model targeting 10–14 sites across major UK cities — shopping centres and retail parks',
    ],
    operator_model: 'hire-manager',
    experience_required: 'management',
    format: ['dine-in', 'takeaway', 'delivery'],
    full_time_required: false,
    multi_site_ready: true,
    locations_available: ['london', 'manchester', 'birmingham', 'leeds', 'liverpool', 'glasgow', 'edinburgh', 'bristol', 'sheffield', 'nottingham'],
    locations_display: 'Major UK cities',
    sectors: ['food-beverage'],
  },
  {
    brand_name: 'You Me Sushi',
    slug: 'you-me-sushi',
    category: 'Casual Dining (Premium Sushi)',
    teaser: 'Premium Japanese sushi and hot food prepared with consistent precision, fresh ingredients, and fast-casual convenience — a trusted brand delivering exceptional quality, speed, and value across dine-in, takeaway, kiosk, and delivery formats.',
    investment_min: 160000,
    investment_max: 200000,
    investment_display: '£160,000 – £200,000',
    timeline_months: 12,
    highlights: [
      'Premium Japanese sushi and hot dishes — grab-and-go, eat-in, kiosk, and delivery in one streamlined model',
      '5% royalty + 2% marketing | disciplined fast-casual operation with strong delivery-platform integration',
      '5 territories available across North, Midlands, South West, Ireland and Scotland',
    ],
    operator_model: 'either',
    experience_required: 'management',
    format: ['dine-in', 'takeaway', 'kiosk', 'delivery'],
    full_time_required: false,
    multi_site_ready: true,
    locations_available: ['manchester', 'leeds', 'liverpool', 'sheffield', 'birmingham', 'nottingham', 'leicester', 'bristol', 'edinburgh', 'glasgow', 'belfast', 'cardiff'],
    locations_display: 'North, Midlands, South West, Ireland & Scotland',
    sectors: ['food-beverage'],
  },
  {
    brand_name: 'Chapati Man',
    slug: 'chapati-man',
    category: 'Casual Dining',
    teaser: 'An authentic Indian street food brand with over 17 years of trading heritage — built from festival roots into a multi-channel operation spanning street food, major UK grocery retail and a flagship dine-in store in East London. Expanding its proven kiosk and quick-service model to high-footfall locations across the UK.',
    investment_min: 20000,
    investment_max: 25000,
    investment_display: '£20,000 – £25,000 franchise fee (fit-out variable by unit size)',
    timeline_months: 15,
    highlights: [
      '17+ years of trading heritage — festival origins, major UK grocery retail presence, and an established flagship dine-in store in East London',
      '£2,500–£3,000 daily revenue potential | lean two-staff kiosk model | 6–8% royalty + 3–5% marketing fee',
      'Multi-unit growth model targeting 3–5 stores across London and major UK cities — perfectly timed for the surge in Indian food demand',
    ],
    operator_model: 'owner-operator',
    experience_required: 'management',
    format: ['dine-in', 'takeaway', 'kiosk'],
    full_time_required: true,
    multi_site_ready: true,
    locations_available: ['london', 'manchester', 'leeds', 'birmingham', 'edinburgh'],
    locations_display: 'London, Manchester, Leeds, Birmingham, Edinburgh & more',
    sectors: ['food-beverage'],
  },
  {
    brand_name: 'PG Fast Food',
    slug: 'pg-fast-food',
    category: 'Quick Service (QSR)',
    teaser: 'A contemporary QSR brand bringing genuine innovation to the fast food market — chef-developed recipes, a family-friendly menu spanning lunch and dinner, and a commercially refined model built from the ground up for franchising. Includes a proprietary loyalty scheme and delivery portal.',
    investment_min: 150000,
    investment_max: 300000,
    investment_display: '£150,000 – £300,000',
    timeline_months: 27,
    highlights: [
      'Chef-developed menu with innovative flavour combinations — proprietary loyalty scheme, own delivery portal, and aggregator integration',
      '£150k–£300k investment | 9% royalty + 3% marketing + £20k franchise fee | semi-absentee with approved GM',
      'Targeting 10 franchise partners in 12 months, each with 5–10 site development agreements',
    ],
    operator_model: 'hire-manager',
    experience_required: 'management',
    format: ['dine-in', 'takeaway', 'delivery'],
    full_time_required: false,
    multi_site_ready: true,
    locations_available: ['london', 'manchester', 'leeds', 'liverpool', 'sheffield', 'edinburgh', 'nottingham', 'cardiff'],
    locations_display: 'Major UK cities & university towns',
    sectors: ['food-beverage'],
  },
]

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })
    }

    const admin = createAdminClient()

    const results = []
    for (const brand of BRANDS) {
      // Skip if slug already exists
      const { data: existing } = await admin
        .from('franchisor_profiles')
        .select('id')
        .eq('slug', brand.slug)
        .single()

      if (existing) {
        results.push({ brand: brand.brand_name, status: 'skipped (already exists)' })
        continue
      }

      const { error } = await admin.from('franchisor_profiles').insert({
        ...brand,
        user_id: null,
        status: 'active',
        contact_email: null,
        contact_name: null,
      })

      results.push({
        brand: brand.brand_name,
        status: error ? `error: ${error.message}` : 'created',
      })
    }

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
