# Franchise Foundry Portal — Master Design & Development Brief
> **This is the single source of truth.** It supersedes `DESIGN_BRIEF.md`. Apply these rules to every new feature, every page edit, and every bug fix — regardless of role or section of the portal.
---
## 1. Stack & Project Context
- **Framework:** Next.js 14 (App Router) — server components by default, `'use client'` only where interaction is needed
- **Styling:** Tailwind CSS with custom tokens (see §3)
- **Database:** Supabase (Postgres + Auth + Storage)
- **Deployment:** Netlify
- **Font:** Sora (configured in `tailwind.config.ts`)
- **Auth / data rules:** Do not change auth logic, RLS, routing, or Supabase queries unless explicitly asked. UI changes only unless stated.
### User Roles
| Role | Portal root | Description |
|------|-------------|-------------|
| `admin` | `/admin` | Franchise Foundry staff — full platform access |
| `franchisee` | `/franchisee` | Prospective franchise buyers |
| `franchisor` | `/franchisor` | Franchise brands listing with FF |
| `introducer` | `/introducer` | Agents/referral partners who submit leads |
### Key Shared Components
| Component | Path | Purpose |
|-----------|------|---------|
| `NavSidebar` | `components/nav-sidebar.tsx` | Role-based left sidebar, used in all layouts |
| `PageHeader` | `components/page-header.tsx` | H1 + description + optional action button |
| `NotificationBell` | `components/notification-bell.tsx` | Compact bell in sidebar header |
| `Card`, `StatCard` | `components/ui/card.tsx` | White card surfaces |
| `Badge`, `statusBadge` | `components/ui/badge.tsx` | Status pills and variant badges |
| Icons | `components/icons.tsx` | Full shared SVG icon set — use only this file |
---
## 2. Quality Bar
The target is **Gusto / Linear / Toast / Rippling quality** — polished startup product, not a self-built dashboard. This means:
- Every page has a clear visual hierarchy: title → description → action zone → content
- Every interactive element has a visible hover, focus, and active state
- No placeholder text left visible — all empty states are designed (see §5.6)
- Consistent spacing throughout — no ad hoc margins
- Brand colour is present but not garish — functional, not decorative
---
## 3. Design Tokens
### 3.1 Colours (from `tailwind.config.ts`)
```
brand-green:       #3a4a3a   primary nav, active states, primary buttons, icons
brand-green-dark:  #2a352a   button hover
brand-gold:        #d4a574   accent — primary/featured cards, CTA highlights, star badges
brand-gold-light:  #e8c9a0   gold tint backgrounds
```
**When to use gold (`brand-gold`):**
- Top accent strip on a "primary" or "featured" card
- The star icon / badge on a franchisee's primary match
- `✦` bullet character in premium feature lists
- Active pipeline stage dot when completed
- Primary CTA button variant (`bg-brand-gold text-white hover:bg-amber-600`)
**When NOT to use gold:**
- Generic stat cards (use `brand-green/10` tint instead)
- Navigation (always `brand-green`)
- Error or warning states (use `red-*` / `amber-*`)
### 3.2 Typography Scale
```
Page title (h1):        text-2xl font-bold tracking-tight text-slate-900
Section heading (h2):   text-lg font-semibold text-slate-900
Card title:             text-sm font-semibold text-slate-800
Body text:              text-sm text-slate-600
Supporting label:       text-xs text-slate-500
Micro label / caption:  text-[11px] text-slate-400
Stat number (large):    text-3xl font-bold text-slate-900 tracking-tight
```
**Never use:**
- `text-xl` for a page-level h1 — it's too small
- `font-semibold` on an h1 — use `font-bold`
- `font-extrabold` unless it's a very large display number
### 3.3 Spacing
```
Page outer padding:    p-4 md:p-8     ← keep as-is, set in layout
Section gap:           mb-6 or mb-8
Card inner padding:    p-5 or p-6
Card gap in grids:     gap-4 or gap-5
Stack gap in card:     space-y-3 or space-y-4
```
### 3.4 Border Radius
```
Page-level cards:     rounded-2xl
Standard cards:       rounded-xl
Buttons (standard):   rounded-lg
Buttons (pill / CTA): rounded-full
Input fields:         rounded-lg
Badges / tags:        rounded-full
Small thumbnails:     rounded-lg or rounded-xl
```
### 3.5 Shadows
```
Default card:       border border-slate-200        (no box-shadow)
Hover state:        hover:shadow-sm hover:border-slate-300
Elevated / modal:   shadow-xl border border-slate-200
Sidebar:            no shadow — flush left edge
```
---
## 4. Component Patterns
### 4.1 Page Header
**Always use the `PageHeader` component** — do not write inline h1 tags on dashboard/listing pages.
```tsx
// components/page-header.tsx — already correct, use as-is
<PageHeader
  title="Page title here"
  description="Optional supporting sentence."
  action={<Button>Optional action</Button>}
/>
```
If you need a page without a description, omit the `description` prop — it is optional.
### 4.2 Stat / KPI Cards
Use this pattern for any metric card. The top accent bar and trend badge are optional.
```tsx
<div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden hover:shadow-sm transition-all">
  {/* Optional top accent — use for featured or primary cards only */}
  <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand-green rounded-t-2xl" />
  <div className="flex items-start justify-between mb-3">
    {/* Icon in tinted container */}
    <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center">
      <SomeIcon className="w-5 h-5 text-brand-green" />
    </div>
    {/* Optional trend badge */}
    {trend && (
      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        {trend}
      </span>
    )}
  </div>
  <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
  <p className="text-sm text-slate-500 mt-0.5">{label}</p>
  {alert && (
    <p className="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full inline-block bg-amber-50 text-amber-700">
      {alert}
    </p>
  )}
</div>
```
**Every stat card must have an SVG icon** from `components/icons.tsx`. No text characters or emoji as icon substitutes.
### 4.3 Feed / List Rows
```tsx
<Link
  href={href}
  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors border-l-2 border-transparent hover:border-brand-green"
>
  <div>
    <p className="text-sm font-medium text-slate-900">{name}</p>
    <p className="text-xs text-slate-400 mt-0.5">{detail}</p>
  </div>
  <div className="flex items-center gap-2 flex-shrink-0">
    {badge}
    <span className="text-xs text-slate-400">{date}</span>
  </div>
</Link>
```
**For urgent rows** (e.g. meeting requested, pending action), use:
```tsx
className="... border-l-2 border-red-400"
```
Never use `border-l-4` — it's too heavy. `border-l-2` is the standard.
### 4.4 Alert / Attention Banners
For in-page contextual banners (not toasts):
```tsx
<div className="bg-brand-green/5 border border-brand-green/20 rounded-xl px-5 py-4 mb-6 flex items-start justify-between gap-4">
  <div>
    <p className="text-sm font-semibold text-brand-green">{heading}</p>
    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{body}</p>
  </div>
  {cta && (
    <Link href={ctaHref} className="shrink-0 text-xs font-semibold text-brand-green hover:underline whitespace-nowrap">
      {cta}
    </Link>
  )}
</div>
```
Colour variants:
- Green (`brand-green/5`, `border-brand-green/20`, text `text-brand-green`) — positive / action
- Amber (`bg-amber-50`, `border-amber-200`, text `text-amber-800`) — warning / pending
- Sky (`bg-sky-50`, `border-sky-200`, text `text-sky-800`) — informational
- Red (`bg-red-50`, `border-red-200`, text `text-red-800`) — urgent / error
**No emoji in banner headings.** Use plain text or an SVG icon inline with `w-4 h-4` if needed.
### 4.5 Empty States
Every empty state must follow this structure — never use a bare `<p>` tag:
```tsx
<div className="flex flex-col items-center justify-center py-16 px-6 text-center">
  {/* Icon container — SVG preferred; emoji acceptable in user-facing journey pages */}
  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
    <SomeIcon className="w-6 h-6 text-slate-400" />
  </div>
  <p className="text-sm font-semibold text-slate-700 mb-1">{heading}</p>
  <p className="text-xs text-slate-400 leading-relaxed max-w-xs">{supportingCopy}</p>
  {/* Optional CTA */}
  {ctaHref && (
    <Link
      href={ctaHref}
      className="mt-4 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {ctaLabel}
    </Link>
  )}
</div>
```
### 4.6 Icon Usage
**All UI icons must come from `components/icons.tsx`.** Available exports:
```
DashboardIcon, LeadsIcon, FranchiseeIcon, FranchisorIcon,
MatchIcon, AgreementIcon, MarketplaceIcon, AgentIcon,
QuestionnaireIcon, BellIcon, SignOutIcon, ChevronDownIcon,
SettingsIcon, PlusIcon, SearchIcon, StarIcon, CheckIcon,
ArrowRightIcon, PartnerIcon
```
Standard sizes:
- Nav items: `w-4 h-4`
- Stat card inside tinted container: `w-5 h-5`
- Buttons and inline: `w-4 h-4`
- Empty state container: `w-6 h-6`
**If you need a new icon, add it to `components/icons.tsx` using the same `defaults` object.** Do not inline SVG elsewhere.
### 4.7 Buttons
```tsx
{/* Primary — brand green */}
<button className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
  Action
</button>
{/* Primary — gold (for premium / featured CTAs) */}
<button className="bg-brand-gold hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
  Action
</button>
{/* Secondary / outline */}
<button className="border border-slate-200 hover:border-brand-green hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
  Action
</button>
{/* Ghost / text */}
<button className="text-brand-green hover:underline text-sm font-medium">
  Action
</button>
```
**Never use a `+` text character or emoji as a button icon.** Use `<PlusIcon className="w-4 h-4" />`.
### 4.8 Loading / Skeleton States
When a component is loading (client-side), show a skeleton:
```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-slate-200 rounded-full w-3/4" />
  <div className="h-4 bg-slate-200 rounded-full w-1/2" />
</div>
```
Server components with Suspense should use a `loading.tsx` sibling file.
### 4.9 Pipeline Progress (step-dot tracker)
For showing a user's progress through a pipeline:
```tsx
<div className="flex items-center">
  {STAGES.map((s, i) => (
    <div key={s.value} className="flex items-center flex-1 last:flex-none">
      <div
        title={s.label}
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
          i < currentIdx
            ? 'bg-brand-green'
            : i === currentIdx
            ? 'bg-brand-green ring-4 ring-brand-green/20'
            : 'bg-slate-200'
        }`}
      />
      {i < STAGES.length - 1 && (
        <div className={`flex-1 h-0.5 mx-0.5 transition-colors ${i < currentIdx ? 'bg-brand-green' : 'bg-slate-200'}`} />
      )}
    </div>
  ))}
</div>
```
---
## 5. Emoji Policy
This is a common source of inconsistency. Follow these rules precisely:
| Context | Emoji allowed? | Use instead |
|---------|---------------|-------------|
| Nav icons | ❌ No | SVG from icons.tsx |
| Stat card icons | ❌ No | SVG from icons.tsx |
| Button icons | ❌ No | SVG from icons.tsx |
| Section / banner headings | ❌ No | Plain text or inline SVG |
| Pipeline stage labels (e.g. "📅 Meeting booked") | ✅ Yes | — |
| Empty state containers (user-facing journey pages) | ✅ Acceptable | SVG preferred |
| User-generated content display | ✅ Yes | — |
| Celebration messages (e.g. agreement signed) | ✅ Yes — sparingly | — |
---
## 6. Current Platform Status — What's In Line / What Still Needs Attention
Run through this before shipping new work. It documents the current state post-upgrade.
### ✅ Compliant
| Area | Status |
|------|--------|
| `NavSidebar` | Icons on all items, gradient background, NotificationBell compact in header, sectionLabel dividers, roleLabel in footer |
| `PageHeader` | `text-2xl font-bold tracking-tight` ✅ |
| Admin dashboard | SVG icons in stat cards, tinted containers, feed rows with left-border urgency, icon imports from icons.tsx |
| Franchisee dashboard | Getting-started checklist with dot/connector, attention banners, stats grid |
| Franchisee matches | PipelineProgress step-dot tracker, gold star on primary match, "Your alternative matches" label |
| FranchiseeKanban | Top border accent per column, stage pill matches column colour, count badge in header |
| `icons.tsx` | Full shared icon set (19 icons), consistent SVG defaults |
| Notification bell | Compact mode in sidebar header |
### ⚠️ Still Needs Attention
These are the areas that didn't fully adopt the brief. Address these in the next pass:
#### 1. Introducer Dashboard (`app/introducer/page.tsx`)
**Issues:**
- Uses inline `<h1 className="text-2xl font-semibold ...">` instead of `<PageHeader>` — replace with `<PageHeader title="Welcome back, {firstName}" description="..." />`
- `font-semibold` on h1 — must be `font-bold`
- KPI cards have no SVG icon in tinted container — add icons (e.g. `LeadsIcon`, `AgentIcon`, `AgreementIcon`, `MatchIcon`)
- "Submit a new lead" button uses `<span className="text-lg leading-none">+</span>` — replace with `<PlusIcon className="w-4 h-4" />`
- "View commission" button uses `💰` emoji — replace with `<MatchIcon className="w-4 h-4" />` or add a `CommissionIcon`
#### 2. Franchisor Dashboard (`app/franchisor/page.tsx`)
**Issues:**
- Inline stat values use `text-2xl font-bold` — must be `text-3xl font-bold tracking-tight` (brief standard)
- "🤝 X introductions arranged" banner heading contains emoji — remove emoji, use plain text or inline SVG
- The three inline stats (new to review / interested / intros) have no icons — add icon in tinted container per stat card pattern
#### 3. Franchisee Dashboard (`app/franchisee/page.tsx`)
**Issues:**
- Primary brand card detail row uses `💰 📅 🏃` inline emojis for investment/timeline/operator — these are data display areas and the emoji adds noise; replace with small label + value pairs or SVG indicators
- `agreement_signed` attention heading: `"🎉 You're in — welcome to the network"` — the 🎉 is borderline; acceptable as a celebration moment but worth being consistent — if keeping, it's fine here as it's a milestone
#### 4. Franchisee Matches (`app/franchisee/matches/page.tsx`)
**Issues:**
- Empty state (no assignment yet) uses `🗺️` emoji in a container — replace with an SVG icon (e.g. `MatchIcon`) per the empty state pattern
- `agreement_signed` stage guidance title contains `🎉` — see note above
#### 5. Admin Feed Rows (`app/admin/page.tsx`)
**Minor:**
- Urgent rows use `border-l-4` — standard is `border-l-2`. Also uses `!pl-4` (Tailwind important flag) as a workaround — remove by setting `pl-4` explicitly and `px-5` only for non-urgent rows
---
## 7. Adding New Features — Checklist
Copy this into your PR description or task notes for every new page or component:
```
[ ] Uses <PageHeader> with text-2xl font-bold tracking-tight
[ ] No emoji used as UI chrome (nav, stats, buttons, banners)
[ ] All icons imported from components/icons.tsx — no inline SVG elsewhere
[ ] Stat cards: icon in w-9 rounded-xl tinted container + text-3xl value
[ ] List/feed rows: border-l-2 border-transparent hover:border-brand-green
[ ] Urgent rows: border-l-2 border-red-400 (not border-l-4)
[ ] Buttons: use SVG icons not text characters or emoji
[ ] Empty state: icon container + bold heading + supporting copy + optional CTA
[ ] Gold accent used if feature has a "primary" or "featured" designation
[ ] All hover/focus states present on interactive elements
[ ] Mobile: tested at 375px width, nothing overflows or is hidden
[ ] New icon needed? Added to components/icons.tsx with same SVG defaults
```
---
## 8. Page Layout Pattern
Every main page follows this structure:
```tsx
export default async function SomePage() {
  // 1. Data fetching (server component)
  const data = await fetchData()
  return (
    <div>
      {/* 2. Page header */}
      <PageHeader
        title="Page title"
        description="Supporting description."
        action={optionalAction}
      />
      {/* 3. Attention banner (if contextual state requires it) */}
      {condition && <AttentionBanner ... />}
      {/* 4. Stats row (if applicable) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => <StatCard ... />)}
      </div>
      {/* 5. Main content — cards, tables, kanban, etc. */}
      <div className="grid grid-cols-2 gap-6">
        {/* ... */}
      </div>
    </div>
  )
}
```
---
## 9. Sidebar Nav — Adding New Items
Nav arrays are in `components/nav-sidebar.tsx`. Structure:
```tsx
type NavLeaf    = { label: string; href: string; icon?: React.ReactNode }
type NavGroup   = { label: string; icon?: React.ReactNode; children: NavLeaf[] }
type NavDivider = { sectionLabel: string }
```
Rules:
- Every `NavLeaf` must have an `icon` from `components/icons.tsx` at `w-4 h-4`
- Every `NavGroup` must have an `icon` from `components/icons.tsx` at `w-4 h-4`
- Use `sectionLabel` dividers to group related items (already: "Pipeline", "Brands", "More" in admin)
- Do not add `NotificationBell` to the nav array — it lives in the header row of the sidebar
---
## 10. What NOT to Change
- Auth logic, session handling, redirects in layouts
- Supabase queries, RLS policies, data shape
- The sidebar gradient (`linear-gradient(160deg, #3a4a3a 0%, #2d3d2d 100%)`)
- Tailwind config brand tokens
- The `compact` prop pattern on `NotificationBell`
- The `NavGroupItem` accordion behaviour
- Any onboarding flows (`/franchisor/onboarding`, `/franchisee/profile`)
- The `preview-banner` component or admin preview functionality
- The brand switcher for multi-brand franchisors
---
## 11. File Reference Map
```
portal/
├── app/
│   ├── admin/
│   │   ├── page.tsx                  ✅ Compliant
│   │   ├── franchisees/
│   │   │   ├── page.tsx
│   │   │   └── FranchiseeKanban.tsx  ✅ Compliant
│   │   ├── franchisors/page.tsx
│   │   ├── leads/page.tsx
│   │   ├── matches/page.tsx
│   │   └── ...
│   ├── franchisee/
│   │   ├── page.tsx                  ✅ Mostly compliant (minor emoji in data display)
│   │   ├── matches/page.tsx          ✅ Mostly compliant (empty state emoji)
│   │   └── ...
│   ├── franchisor/
│   │   ├── page.tsx                  ⚠️ Stat values text-2xl, emoji in banner, no stat icons
│   │   └── ...
│   └── introducer/
│       ├── page.tsx                  ⚠️ No PageHeader, emoji buttons, no stat icons
│       └── ...
├── components/
│   ├── nav-sidebar.tsx               ✅ Compliant
│   ├── page-header.tsx               ✅ Compliant
│   ├── notification-bell.tsx         ✅ Compliant
│   ├── icons.tsx                     ✅ Complete icon set
│   └── ui/
│       ├── card.tsx
│       └── badge.tsx
└── PORTAL_BRIEF.md                   ← you are here
```
---
## 12. Automations, Triggers & Notifications
This section maps every automated action in the platform. **Do not add new emails, notifications, or triggers outside these patterns** — use the existing helpers.
### 12.1 Key Files
| File | Purpose |
|------|---------|
| `lib/notifications.ts` | `notifyAdmins()` — inserts in-app notification rows for all admins |
| `lib/email.ts` | All transactional email functions (via Resend) |
| `lib/email/resend.ts` | Resend client configuration |
| `lib/supabase/send-magic-link.ts` | Magic link sender for invitations |
| `lib/matching.ts` | `scoreMatch()` — scoring engine for franchisee ↔ franchisor fit |
**Rule: never call Resend directly from a route.** All email goes through the named functions in `lib/email.ts`.
---
### 12.2 Trigger Map — What fires when
#### Lead Flow
| Trigger | Where | What fires |
|---------|-------|-----------|
| Lead submits quiz | `POST /api/leads` | Scores against all active franchisors → `lead_matches`; `sendLeadNotificationToTeam()` to admin; `sendLeadConfirmationToFranchisee()` to lead |
| Admin converts lead | `POST /api/admin/leads/[id]/convert` | Creates auth user + `profiles` + `franchisee_profiles`; transfers `lead_matches` → `matches`; sends magic link |
| Admin manually notifies franchisor about a lead | `POST /api/admin/notify-franchisor` | `sendFranchisorMatchNotification()` to franchisor email |
| Admin runs matching | `POST /api/admin/run-matching` | Scores all active franchisees × all active franchisors; upserts `matches` |
#### Franchisor Flow
| Trigger | Where | What fires |
|---------|-------|-----------|
| Admin invites franchisor | `POST /api/admin/franchisors/[id]/invite` | Creates auth user; links to `franchisor_profiles`; sends magic link; records in `invites` |
| Franchisor first login | `app/franchisor/layout.tsx` (server layout) | One-time: `notifyAdmins()` type `franchisor_first_login`; sets `first_login_notified = true` |
| Franchisor submits onboarding quiz | `POST /api/franchisor/onboarding` | Upserts `franchisor_questionnaires`; syncs key fields to `franchisor_profiles`; `notifyAdmins()` |
| Admin saves franchisor questionnaire | `PATCH /api/admin/franchisors/[id]/questionnaire` | Upserts `franchisor_questionnaires`; **syncs matching-critical fields to `franchisor_profiles`** (see §12.4) |
#### Franchisee Flow
| Trigger | Where | What fires |
|---------|-------|-----------|
| Admin invites franchisee directly | `POST /api/admin/invite` | Creates auth user; sends magic link; records in `invites` |
| Franchisee first login | `app/franchisee/layout.tsx` (server layout) | One-time: `notifyAdmins()` type `franchisee_first_login`; sets `first_login_notified = true` |
| Admin assigns primary brand | `POST /api/admin/franchisees/[id]/assign-brand` (rank=1) | Updates `franchisee_profiles.assigned_franchisor_id`; sets `pipeline_stage = 'brand_shortlisted'`; upserts `matches` row with `pipeline_stage = 'match_assigned'`; `sendFranchisorMatchNotification()` to franchisor |
| Admin assigns backup brand | Same endpoint (rank=2 or 3) | Updates `backup_franchisor_1_id` / `backup_franchisor_2_id`; no email |
#### Agreement Flow
| Trigger | Where | What fires |
|---------|-------|-----------|
| Admin sends agreement | `POST /api/admin/agreements/send` | Creates `franchisor_agreements` row (status=`sent`); in-app notification to franchisor (`agreement_ready`); `notifyAdmins()` type `agreement_sent` |
| Franchisor signs agreement | `POST /api/franchisor/agreement/sign` | Generates PDF; updates `franchisor_agreements` (status=`signed`, IP, timestamp); `notifyAdmins()` type `agreement_signed` |
#### Marketplace Flow
| Trigger | Where | What fires |
|---------|-------|-----------|
| User requests marketplace intro | `POST /api/intro-requests` | Creates `intro_requests` row; `sendIntroRequestNotification()` to admin email; `notifyAdmins()` type `intro_requested` |
---
### 12.3 In-App Notification Types
Notifications are stored in the `notifications` table and surfaced via the `NotificationBell` component.
| `type` value | Who receives | When |
|-------------|-------------|------|
| `franchisee_first_login` | Admins | Franchisee logs in for the first time |
| `franchisor_first_login` | Admins | Franchisor logs in for the first time |
| `agreement_sent` | Admins | Admin sends agreement to a franchisor |
| `agreement_signed` | Admins | Franchisor signs their agreement |
| `agreement_ready` | Franchisor user | Admin sends agreement to them |
| `intro_requested` | Admins | Anyone submits a marketplace intro request |
**Adding a new notification type:**
1. Call `notifyAdmins()` for admin-facing alerts (pass a `type`, `title`, `body`, `link`)
2. Insert directly into `notifications` via admin client for user-facing alerts
3. Always include a `link` that takes the recipient to the relevant page
---
### 12.4 Questionnaire → Profile Sync
**Critical:** The matching algorithm (`lib/matching.ts`) reads from `franchisor_profiles`, not `franchisor_questionnaires`. Whenever questionnaire data is saved, these fields **must be synced** to `franchisor_profiles`:
```
investment_min          ← questionnaire.investment_min
investment_max          ← questionnaire.investment_max
franchise_fee           ← questionnaire.franchise_fee
royalty_pct             ← questionnaire.royalty_pct
marketing_levy_pct      ← questionnaire.marketing_levy_pct
operator_model          ← questionnaire.operating_model_raw
multi_site_ready        ← !questionnaire.single_franchise_licenses
liquid_capital_min      ← questionnaire.liquid_capital_min
experience_required     ← questionnaire.experience_required
full_time_required      ← questionnaire.full_time_required
timeline_months         ← questionnaire.timeline_months
format                  ← questionnaire.format_types
locations_available     ← questionnaire.locations_available
```
This sync is already implemented in `PATCH /api/admin/franchisors/[id]/questionnaire`. Any new route that saves questionnaire data must replicate this sync.
---
### 12.5 Email Functions (lib/email.ts)
| Function | Recipient | When to use |
|----------|-----------|------------|
| `sendLeadNotificationToTeam()` | Admin email (`ADMIN_NOTIFICATION_EMAIL`) | New lead submits the public matching quiz |
| `sendLeadConfirmationToFranchisee()` | Lead's email | Immediately after quiz submission |
| `sendFranchisorMatchNotification()` | Franchisor's email | Admin assigns a primary brand OR manually notifies |
| `sendIntroRequestNotification()` | Admin email | Marketplace intro request submitted |
**Adding a new email:**
1. Add the function to `lib/email.ts` — match the HTML style (Sora font, `#3a4a3a` header, white body, branded button)
2. Wrap the send call in try/catch — email failures must never block the main operation
3. Only re-throw if the email is the primary purpose of the request (e.g. franchisor notification endpoint)
4. Use `FROM` and `ADMIN_EMAIL` constants from the top of the file — never hardcode addresses
---
### 12.6 Scoring Engine (lib/matching.ts)
`scoreMatch(franchisee, franchisor)` returns 0–100. Hard filters return 0 immediately (unaffordable, wrong location, etc.). Scores above 0 are upserted into the `matches` table with `status = 'suggested'`.
**`scoreLabel()` thresholds:**
- 85+ → Excellent match
- 70+ → Strong match
- 52+ → Good match
- 35+ → Potential match
- <35 → Partial match
When adding new franchisee or franchisor profile fields that are relevant to matching, add the scoring logic to `scoreMatch()` and update the total max score comment at the top of the function.
---
### 12.7 Magic Links & Auth
All portal invitations use magic links, never password setup. Flow:
1. Admin action calls `sendMagicLink(email, name, redirectPath)` from `lib/supabase/send-magic-link.ts`
2. User lands on `app/auth/confirm/page.tsx` which exchanges the token and sets the session
3. After confirm, user is redirected to their role-appropriate portal root
**Never create a user and expect Supabase's own email to fire** — `email_confirm: true` is always set to suppress the default Supabase email, and our magic link is sent manually.
---
*Last updated: June 2026. Update Section 6 whenever compliance status changes. Update Section 12.3 whenever a new notification type is added.*
