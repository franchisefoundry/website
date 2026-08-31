/* TEMP design-review route — auth-free faithful render of the real components
   with mock data. One entry URL (/design-preview) with a sticky switcher bar to
   move between screens. Remove this file (and the /design-preview entry in
   middleware.ts) before merging. */
import { NavSidebar } from '@/components/nav-sidebar'
import { PageHeader } from '@/components/page-header'
import { SettingsTabs } from '@/components/SettingsTabs'
import BrandProfileForm from '../franchisor/brand-profile/brand-profile-form'
import { CandidatesView, type Candidate } from '../franchisor/matches/CandidatesView'
import { AdminHomeView, type AdminHomeAction } from '@/components/admin/AdminHomeView'
import FranchisorsCards, { type BrandCard } from '../admin/franchisors/FranchisorsCards'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { FranchiseeHomeView } from '@/components/franchisee/FranchiseeHomeView'
import { JourneyBrandCard } from '@/components/franchisee/JourneyBrandCard'
import { ClientComposer } from '@/components/client/ClientComposer'
import AgreementsTable from '../admin/agreements/AgreementsTable'
import { AgreementSection } from '@/components/admin/AgreementSection'
import TemplateEditor from '../admin/agreements/TemplateEditor'
import { Avatar } from '@/components/ui/Avatar'

const BRAND_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%233a4a3a'/%3E%3Ctext x='20' y='27' font-size='20' fill='%23c8924a' text-anchor='middle' font-family='sans-serif' font-weight='bold'%3EZ%3C/text%3E%3C/svg%3E"
import { PipelineBoard, type PipelineCard } from '@/components/franchisor/PipelineBoard'
import { PerformanceView } from '@/components/franchisor/PerformanceView'
import { MessageThread, type ThreadMessage } from '@/components/client/MessageThread'
import { scoreColour } from '@/lib/matching'
import { cn } from '@/lib/utils'
import type { FranchisorProfile } from '@/lib/supabase/types'
import { FranchisorIcon, CalendarIcon, QuestionnaireIcon, BellIcon } from '@/components/icons'

/* eslint-disable @typescript-eslint/no-explicit-any */

const brandOwner: any = { id: 'preview-user', role: 'franchisor', full_name: 'Zambrero UK', email: 'brand@zambrero.co.uk', avatar_url: null, setup_complete: true }
const adminUser: any = { id: 'preview-admin', role: 'admin', full_name: 'Ben Foundry', email: 'ben@franchisefoundry.co.uk', avatar_url: null, setup_complete: true }

const brandProfile = {
  id: 'preview-brand', user_id: 'preview-user', slug: 'zambrero', brand_name: 'Zambrero',
  category: 'Quick Service · Mexican', teaser: 'A purpose-led Mexican QSR — every burrito sold funds a meal for someone in need. Proven UK unit economics and a values-first brand candidates rally behind.',
  investment_min: 150000, investment_max: 300000, investment_display: '£150,000 – £300,000',
  locations_available: ['manchester', 'birmingham', 'leeds'], locations_display: 'Major UK cities',
  sectors: ['food-beverage', 'health'], timeline_months: null,
  highlights: ['No F&B experience required', 'Full training & site support', 'Social-impact brand story'],
  operator_model: '', format: ['dine-in', 'takeaway'], experience_required: 'none',
  multi_site_ready: true, full_time_required: true, status: 'active', logo_url: BRAND_LOGO,
} as any as FranchisorProfile

const candidates: Candidate[] = [
  { id: 'c1', status: 'suggested', stageIndex: 0, score: 88, scoreLabel: 'strong fit', scoreClass: 'bg-ff-green/10 text-ff-green', budget: '£150k–300k', liquidCapital: '£90k', timeline: '6 months', operator: 'Owner-operator', experience: 'Management', fullTime: 'Yes', locations: ['Manchester'], reasons: ['Budget aligned', 'Manchester available', 'Operator matches', 'Timeline fits'], goals: 'Build a small group of sites over 5 years — hands-on first, then hire managers.', displayName: null, displayCity: 'Manchester' },
  { id: 'c2', status: 'suggested', stageIndex: 0, score: 84, scoreLabel: 'strong fit', scoreClass: 'bg-ff-green/10 text-ff-green', budget: '£120k–250k', liquidCapital: '£70k', timeline: '9 months', operator: 'Either', experience: 'First-timer', fullTime: 'Yes', locations: ['Birmingham'], reasons: ['Budget aligned', 'Birmingham available', 'Open to all backgrounds'], goals: 'First time in franchising — drawn to a purpose-led brand with strong training.', displayName: null, displayCity: 'Birmingham' },
  { id: 'c3', status: 'interested', stageIndex: 1, score: 79, scoreLabel: 'good fit', scoreClass: 'bg-ff-gold/15 text-ff-gold-ink', budget: '£100k–200k', liquidCapital: '£60k', timeline: '12 months', operator: 'Hire a manager', experience: 'F&B background', fullTime: 'No', locations: ['Leeds'], reasons: ['F&B experience', 'Leeds available'], goals: 'Semi-absentee investor looking to build a managed portfolio.', displayName: 'James Whitfield', displayCity: 'Leeds' },
]

const pipelineByStage: Record<string, PipelineCard[]> = {
  matched: [
    { id: 'm1', name: 'Confidential', score: 88, scoreCls: scoreColour(88), budget: '£150–300k' },
    { id: 'm2', name: 'Confidential', score: 84, scoreCls: scoreColour(84), budget: '£120–250k' },
    { id: 'm3', name: 'Confidential', score: 79, scoreCls: scoreColour(79), budget: '£100–200k' },
  ],
  interested: [{ id: 'i1', name: 'Confidential', score: 82, scoreCls: scoreColour(82), budget: '£130–260k' }],
  intro: [{ id: 'n1', name: 'James', score: 76, scoreCls: scoreColour(76), budget: '£100–200k' }],
  meeting: [], agreement: [],
}

const perfKpis = [{ n: 12, l: 'Candidates matched' }, { n: 83, l: 'Avg fit score', suffix: '%' }, { n: 5, l: "You're interested" }, { n: 2, l: 'Intros arranged' }]
const perfFunnel: [string, number][] = [['Matched', 12], ['Interested', 5], ['Intro made', 2], ['Meeting', 1], ['Agreement', 0]]

const threadMessages: ThreadMessage[] = [
  { id: '1', body: "Hi — welcome to Franchise Foundry! Your brand profile is live and we've started matching candidates for Zambrero.", from_admin: true, created_at: '2026-08-28T09:12:00Z' },
  { id: '2', body: 'Thanks! Excited to see the first candidates come through.', from_admin: false, created_at: '2026-08-28T09:20:00Z' },
  { id: '3', body: 'Two strong candidates are in your Candidates tab now — both budget-aligned and in your target cities.', from_admin: true, created_at: '2026-08-28T14:03:00Z' },
]

const adminKpis = [{ n: 42, l: 'Leads', href: '#' }, { n: 18, l: 'Franchisees', href: '#' }, { n: 7, l: 'Brands', href: '#' }, { n: 12, l: 'Matches', href: '#' }]
const adminActions: AdminHomeAction[] = [
  { g: 'Today', tone: ['bg-ff-gold-soft', 'text-ff-gold-ink'], icon: <CalendarIcon className="w-[18px] h-[18px]" />, t: 'Book 2 meetings', sub: 'Franchisees have requested a call', href: '#', btn: 'Open' },
  { g: 'Today', tone: ['bg-ff-green/10', 'text-ff-green'], icon: <QuestionnaireIcon className="w-[18px] h-[18px]" />, t: 'Review 3 brand questionnaires', sub: 'Awaiting your approval', href: '#', btn: 'Review' },
  { g: 'This week', tone: ['bg-[#eff4ff]', 'text-[#3b62c4]'], icon: <BellIcon className="w-[18px] h-[18px]" />, t: 'Approve 1 intro request', sub: 'Marketplace connections pending', href: '#', btn: 'Open' },
]
const adminFeed = [
  { dot: 'var(--ff-gold-ink)', text: 'New lead <b>Sarah Kelly</b> from the matching quiz', time: '2h ago' },
  { dot: 'var(--ff-gold-ink)', text: 'New lead <b>Tom Reyes</b> from an agent referral', time: '5h ago' },
  { dot: 'var(--ff-gold-ink)', text: 'New lead <b>Priya Shah</b> from the matching quiz', time: 'Yesterday' },
]

const adminBrands: BrandCard[] = [
  { id: 'b1', brand_name: 'Zambrero', category: 'Quick Service · Mexican', email: 'ben@zambrero.co.uk', status: 'active', logo_url: BRAND_LOGO, fee: '£35k', cands: 12, prog: 100 },
  { id: 'b2', brand_name: 'Sides', category: 'QSR · Chicken', email: 'ops@sides.co.uk', status: 'pending_review', logo_url: null, fee: '£30k', cands: 4, prog: 70 },
  { id: 'b3', brand_name: 'Coffee & Co', category: 'Coffee', email: 'hello@coffeeco.uk', status: 'draft', logo_url: null, fee: '£25k', cands: 0, prog: 40 },
]

const feeUser: any = { id: 'preview-fee', role: 'franchisee', full_name: 'Alex Rivera', email: 'alex@example.com', avatar_url: null, setup_complete: true }

const agmtRows: any[] = [
  { id: 'a1', status: 'signed', sent_at: '2026-08-10T09:00:00Z', signed_at: '2026-08-14T16:20:00Z', signer_name: 'Ben Ortiz', signed_pdf_path: 'x', franchisor_profiles: { id: 'b1', brand_name: 'Zambrero', user_id: 'u1', profiles: { full_name: 'Ben Ortiz', email: 'ben@zambrero.co.uk' } } },
  { id: 'a2', status: 'sent', sent_at: '2026-08-22T11:00:00Z', signed_at: null, signer_name: null, signed_pdf_path: null, franchisor_profiles: { id: 'b2', brand_name: 'Sides', user_id: 'u2', profiles: { full_name: 'Ops Team', email: 'ops@sides.co.uk' } } },
]
const agmtFranchisors: any[] = [
  { id: 'b1', brand_name: 'Zambrero', user_id: 'u1', profiles: { full_name: 'Ben Ortiz', email: 'ben@zambrero.co.uk' } },
  { id: 'b2', brand_name: 'Sides', user_id: 'u2', profiles: { full_name: 'Ops Team', email: 'ops@sides.co.uk' } },
  { id: 'b3', brand_name: 'Coffee & Co', user_id: 'u3', profiles: { full_name: 'Sam Lee', email: 'sam@coffeeco.uk' } },
]

const NAV: [string, string][] = [
  ['profile', 'Brand profile'], ['candidates', 'Candidates'], ['pipeline', 'Pipeline'],
  ['performance', 'Performance'], ['messages', 'Messages'], ['admin', 'Admin home'], ['admin-brands', 'Admin · Brands'], ['admin-messages', 'Admin · Messages'], ['admin-agreements', 'Admin · Agreements'],
  ['fee', 'Franchisee · Home'], ['fee-journey', 'Franchisee · My Journey'], ['fee-start', 'Franchisee · Start'],
]

const feePrimary: any = { id: 'm1', pipeline_stage: 'meeting_booked', franchisor_notes: 'Great fit on budget and location — I\'ve asked the brand to hold a call slot next week. Have a think about the questions you\'d like to cover.', franchisor_profiles: { id: 'b1', brand_name: 'Zambrero', category: 'Quick Service · Mexican', teaser: 'A purpose-led Mexican QSR with proven UK unit economics and full training and site support.', investment_display: '£150,000 – £300,000', timeline_months: 6, operator_model: 'owner-operator', experience_required: 'none' } }
const feeBackup: any = { id: 'm2', pipeline_stage: 'match_assigned', franchisor_notes: null, franchisor_profiles: { id: 'b2', brand_name: null, category: 'Coffee', teaser: null, investment_display: '£90,000 – £180,000', timeline_months: 4, operator_model: 'either', experience_required: 'none' } }

function PreviewNav({ active }: { active: string }) {
  return (
    <div className="sticky top-0 z-30 -mx-4 md:-mx-8 mb-6 px-4 md:px-8 py-2.5 bg-surface/90 backdrop-blur border-b border-line flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ff-gold-ink mr-2">Design preview</span>
      {NAV.map(([id, label]) => (
        <a key={id} href={`/design-preview?view=${id}`}
          className={cn('text-xs font-medium rounded-lg px-3 py-1.5 transition-colors', active === id ? 'bg-ff-green text-white' : 'text-ink-2 hover:bg-surface-2')}>
          {label}
        </a>
      ))}
    </div>
  )
}

export default async function DesignPreview({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const raw = (await searchParams).view ?? 'profile'
  const view = NAV.some(([id]) => id === raw) ? raw : 'profile'

  const franchisorScreens: Record<string, React.ReactNode> = {
    profile: (
      <>
        <div className="flex items-start gap-4">
          <BrandLogo src={brandProfile.logo_url} name={brandProfile.brand_name} size="xl" className="mt-1" />
          <div className="flex-1 min-w-0">
            <PageHeader title="Your brand" description="Your profile, questionnaire and territories — everything candidates and our matching see." />
          </div>
        </div>
        <SettingsTabs orientation="top" tabs={[{ id: 'profile', label: 'Profile', icon: <FranchisorIcon className="w-4 h-4" />, content: <BrandProfileForm brandProfile={brandProfile} userId="preview-user" /> }]} />
      </>
    ),
    candidates: (
      <div className="max-w-3xl">
        <PageHeader title="Candidates" description="People our matching has surfaced for Zambrero. Review, express interest, or pass." />
        <CandidatesView candidates={candidates} />
      </div>
    ),
    pipeline: (
      <>
        <PageHeader title="Pipeline" description="Every candidate matched to your brand, by stage." />
        <PipelineBoard byStage={pipelineByStage} />
      </>
    ),
    performance: (
      <div className="max-w-4xl">
        <PageHeader title="Performance" description="How your brand is doing across the recruitment funnel." />
        <PerformanceView kpis={perfKpis} funnel={perfFunnel} />
      </div>
    ),
    messages: (
      <div className="max-w-3xl">
        <PageHeader title="Messages" description="Chat directly with the Franchise Foundry team." />
        <MessageThread messages={threadMessages} composer={<ClientComposer />} />
      </div>
    ),
  }

  const isAdmin = view.startsWith('admin')
  const isFee = view.startsWith('fee')
  const adminScreens: Record<string, React.ReactNode> = {
    admin: <AdminHomeView greeting="Good afternoon" firstName="Ben" kpis={adminKpis} actions={adminActions} feed={adminFeed} />,
    'admin-brands': (
      <div>
        <PageHeader title="Brands" description="Every franchise brand on the platform." />
        <FranchisorsCards brands={adminBrands} />
      </div>
    ),
    'admin-messages': (
      <div>
        <PageHeader title="Messages" description="Conversations with franchisees, brands and agents." />
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)]" style={{ height: 'calc(100vh - 260px)', minHeight: 440 }}>
          <div className="border-r border-line-2 overflow-y-auto">
            {[
              { name: 'Zambrero', last: 'Two strong candidates are in your tab now.', active: true, square: true },
              { name: 'Alex Rivera', last: 'Thanks! Excited to see the first candidates.', active: false, square: false },
              { name: 'Jordan Blake', last: 'New referral sent your way — Priya Shah.', active: false, square: false },
            ].map(t => (
              <div key={t.name} className={`flex gap-3 items-center px-4 py-3 border-b border-line-2 cursor-pointer ${t.active ? 'bg-ff-green/[0.06]' : 'hover:bg-surface-2'}`}>
                <Avatar name={t.name} size="md" square={t.square} />
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink truncate">{t.name}</p><p className="text-xs text-ink-3 truncate">{t.last}</p></div>
              </div>
            ))}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="px-5 py-3.5 border-b border-line-2 flex items-center gap-3">
              <Avatar name="Zambrero" size="md" square />
              <div><p className="text-sm font-semibold text-ink">Zambrero</p><p className="text-[11px] text-ink-3">Brand · portal + app</p></div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2.5">
              <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm bg-surface-2 border border-line-2 rounded-bl-md text-ink">When will the first candidates come through?<div className="text-[10.5px] mt-1 text-ink-3">Zambrero · 28 Aug, 11:12</div></div>
              <div className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm ml-auto bg-ff-green text-white rounded-br-md">Two strong candidates are in your tab now — both budget-aligned and in your target cities.<div className="text-[10.5px] mt-1 text-white/60">You · 28 Aug, 14:03</div></div>
            </div>
            <div className="border-t border-line-2 p-3 flex items-end gap-2">
              <input placeholder="Write a message…" className="flex-1 text-sm border border-line rounded-lg px-3 py-2 bg-surface text-ink outline-none focus:ring-2 focus:ring-ff-green" />
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-ff-green text-white">Send</button>
            </div>
          </div>
        </div>
        <p className="text-xs text-ink-3 mt-2">To start a new conversation, the composer shows a &ldquo;To…&rdquo; picker (franchisees / brands / agents) when no thread is selected — admins can message anyone.</p>
      </div>
    ),
    'admin-agreements': (
      <div className="space-y-10">
        <PageHeader title="Agreements" description="Manage the master franchise agreement template and track signatures." />
        <section>
          <h2 className="text-base font-semibold text-ink mb-1">Active agreements</h2>
          <p className="text-sm text-ink-3 mb-4">Send a new agreement, track signatures, and open any brand&apos;s agreement to review or edit it.</p>
          <AgreementsTable franchisorAgreements={agmtRows} allFranchisors={agmtFranchisors} hasTemplate />
        </section>
        <section className="max-w-2xl">
          <h2 className="text-base font-semibold text-ink mb-1">On a brand record</h2>
          <p className="text-sm text-ink-3 mb-4">Individual agreements live under the brand — status, timeline, download and the brand&apos;s comments.</p>
          <AgreementSection
            agreement={{ id: 'a2', status: 'sent', sent_at: '2026-08-22T11:00:00Z', signed_at: null, signer_name: null, signed_pdf_path: null }}
            comments={[
              { id: 'c1', body: 'Can we clarify the territory exclusivity radius in section 4? We assumed 3 miles.', section_ref: 'Section 4 — Territory', created_at: '2026-08-23T10:00:00Z', author_name: 'Ben Ortiz' },
              { id: 'c2', body: 'Fee schedule looks good, no changes needed there.', section_ref: null, created_at: '2026-08-23T10:04:00Z', author_name: 'Ben Ortiz' },
            ]} />
        </section>
        <section>
          <h2 className="text-base font-semibold text-ink mb-1">Agreement template</h2>
          <p className="text-sm text-ink-3 mb-4">Upload a Word doc or edit the master agreement here. Every save creates a new version — brands sign the version current at send time.</p>
          <TemplateEditor initial={{ id: 't1', title: 'Master Franchise Agreement', content: '# Master Franchise Agreement\n\n## 1. Parties\n\nThis agreement is made between Franchise Foundry Ltd and the Franchisee.\n\n## 2. Grant of Franchise\n\nThe Franchisor grants the Franchisee the right to operate under the brand.\n\n## 3. Term\n\nThe initial term is five (5) years.\n\n## 4. Territory\n\nThe Franchisee is granted an exclusive territory as defined in Schedule A.', version: 3, updated_at: '2026-08-20T09:00:00Z' }} />
        </section>
      </div>
    ),
  }
  const feeScreens: Record<string, React.ReactNode> = {
    fee: (
      <FranchiseeHomeView firstName="Alex" profileExists hasPrimaryBrand stageIndex={2}
        primaryBrand={{ brand_name: 'Zambrero', category: 'Quick Service · Mexican', teaser: 'A purpose-led Mexican QSR with proven UK unit economics and full training and site support.', investment_display: '£150,000 – £300,000', timeline_months: 6, operator_model: 'owner-operator' }}
        consultantNote="Great fit on budget and location — I've asked the brand to hold a call slot next week. Have a think about the questions you'd like to cover."
        attention={{ heading: 'Your intro meeting is booked — prepare now', body: 'Think about what you want from this meeting — day-to-day operations, investment returns and support are all fair game.' }}
        kpis={[{ n: 3, l: 'Brands matched' }, { n: 1, l: "You're interested" }, { n: 1, l: 'Intros arranged' }, { n: 80, l: 'Profile complete', suffix: '%' }]}
        completeness={80} />
    ),
    'fee-start': (
      <FranchiseeHomeView firstName="Alex" profileExists hasPrimaryBrand={false} stageIndex={-1}
        primaryBrand={null} consultantNote={null} attention={null}
        kpis={[{ n: 0, l: 'Brands matched' }, { n: 0, l: "You're interested" }, { n: 0, l: 'Intros arranged' }, { n: 60, l: 'Profile complete', suffix: '%' }]}
        completeness={60} />
    ),
    'fee-journey': (
      <div className="max-w-4xl">
        <PageHeader title="Your journey" description="Track where you are with your matched brands. Your consultant manages these on your behalf." />
        <div className="space-y-6">
          <JourneyBrandCard rank="primary" match={feePrimary} />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-3">Your alternative matches</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <JourneyBrandCard rank="backup" match={feeBackup} delay={0.06} />
              <JourneyBrandCard rank="backup" match={null} placeholder="Backup option being identified…" delay={0.12} />
            </div>
          </div>
        </div>
      </div>
    ),
  }
  const sidebarProfile = isAdmin ? adminUser : isFee ? feeUser : brandOwner
  return (
    <div className="flex min-h-screen">
      <NavSidebar profile={sidebarProfile}
        brands={isAdmin || isFee ? undefined : [{ id: 'preview-brand', brand_name: 'Zambrero', status: 'active' }]}
        activeBrandId={isAdmin || isFee ? undefined : 'preview-brand'} adminPreview={false} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8">
          <PreviewNav active={view} />
          {isAdmin ? adminScreens[view] : isFee ? feeScreens[view] : franchisorScreens[view]}
        </div>
      </main>
    </div>
  )
}
