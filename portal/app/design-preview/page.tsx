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
  multi_site_ready: true, full_time_required: true, status: 'active',
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
  { id: 'b1', brand_name: 'Zambrero', category: 'Quick Service · Mexican', email: 'ben@zambrero.co.uk', status: 'active', fee: '£35k', cands: 12, prog: 100 },
  { id: 'b2', brand_name: 'Sides', category: 'QSR · Chicken', email: 'ops@sides.co.uk', status: 'pending_review', fee: '£30k', cands: 4, prog: 70 },
  { id: 'b3', brand_name: 'Coffee & Co', category: 'Coffee', email: 'hello@coffeeco.uk', status: 'draft', fee: '£25k', cands: 0, prog: 40 },
]

const NAV: [string, string][] = [
  ['profile', 'Brand profile'], ['candidates', 'Candidates'], ['pipeline', 'Pipeline'],
  ['performance', 'Performance'], ['messages', 'Messages'], ['admin', 'Admin home'], ['admin-brands', 'Admin · Brands'],
]

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
        <PageHeader title="Your brand" description="Your profile, questionnaire and territories — everything candidates and our matching see." />
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
        <MessageThread messages={threadMessages} composer={
          <div className="flex gap-2">
            <input disabled placeholder="Write a message…" className="flex-1 px-3 py-2.5 rounded-xl text-sm bg-surface-2 border border-line text-ink placeholder:text-ink-3" />
            <button disabled className="bg-ff-green text-white px-4 rounded-xl text-sm font-medium opacity-90">Send</button>
          </div>
        } />
      </div>
    ),
  }

  const isAdmin = view.startsWith('admin')
  const adminScreens: Record<string, React.ReactNode> = {
    admin: <AdminHomeView greeting="Good afternoon" firstName="Ben" kpis={adminKpis} actions={adminActions} feed={adminFeed} />,
    'admin-brands': (
      <div>
        <PageHeader title="Brands" description="Every franchise brand on the platform." />
        <FranchisorsCards brands={adminBrands} />
      </div>
    ),
  }
  return (
    <div className="flex min-h-screen">
      <NavSidebar profile={isAdmin ? adminUser : brandOwner}
        brands={isAdmin ? undefined : [{ id: 'preview-brand', brand_name: 'Zambrero', status: 'active' }]}
        activeBrandId={isAdmin ? undefined : 'preview-brand'} adminPreview={false} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-8">
          <PreviewNav active={view} />
          {isAdmin ? adminScreens[view] : franchisorScreens[view]}
        </div>
      </main>
    </div>
  )
}
