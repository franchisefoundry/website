# Franchise Foundry Portal — UX Upgrade Brief

## Context

This portal serves four user roles: **admin**, **franchisee**, **franchisor**, and **introducer**. It is built with Next.js 14 (App Router), Tailwind CSS, Supabase, and is deployed on Netlify. The font is Sora. The brand colour is `#3a4a3a` (dark forest green) and the accent is `#d4a574` (warm gold).

The portal works well functionally. This brief covers a set of visual and UX upgrades to make it feel like a polished, premium startup product — not a self-built dashboard. Think Gusto, Linear, Toast, Rippling, or Mindbody in terms of target quality bar.

**Do not change any data logic, routing, auth, or Supabase queries unless explicitly stated. This is a pure UX/UI upgrade pass.**

---

## 1. Design System — Rules for All Existing and Future Work

These rules apply to every page and component in the portal, now and going forward. Treat this as the source of truth whenever adding new features.

### 1.1 Typography Scale

```
Page title (h1):        text-2xl font-bold tracking-tight   (≈ 26px)
Section heading (h2):   text-lg font-semibold                (≈ 18px)
Card title:             text-sm font-semibold                (≈ 14px)
Body / paragraph:       text-sm text-slate-600              (≈ 14px)
Supporting label:       text-xs text-slate-500              (≈ 12px)
Micro label / caption:  text-[11px] text-slate-400
```

**Never use `text-xl` for a page-level h1.** The current `PageHeader` component uses `text-xl` — this must be updated. Page titles must be commanding and immediately readable.

### 1.2 Colour Palette

```
brand-green:       #3a4a3a   — primary nav, active states, primary buttons
brand-green-dark:  #2a352a   — button hover
brand-green-light: #5f725f   — hover states, subtle tints
brand-gold:        #d4a574   — accent, premium indicators, CTA highlights
brand-gold-light:  #e8c9a0   — gold tint backgrounds
slate-50:          #f8fafc   — page background (keep as-is)
white:             #ffffff   — card surfaces
```

**The gold colour `#d4a574` must be used meaningfully.** It is the signal of quality in a hospitality-adjacent brand. Use it for:
- The top accent strip on featured/primary cards
- The primary CTA button variant (`bg-brand-gold text-white`)
- The primary match / featured badge
- The `✦` bullet character in feature lists
- Active pipeline stage indicators

**Never use emoji as icons in UI chrome.** Emoji are acceptable in user-generated content and pipeline stage labels (e.g. 📅 Meeting booked) but must not appear as icon replacements in stat cards, nav items, or section headers.

### 1.3 Spacing

```
Page outer padding:    p-4 md:p-8             (keep as-is — already correct)
Section gap:           mb-6 or mb-8
Card inner padding:    p-5 or p-6
Card gap in grids:     gap-4 or gap-5
Stack gap inside card: space-y-3 or space-y-4
```

### 1.4 Border Radius

```
Page-level cards:     rounded-2xl
Standard cards:       rounded-xl
Buttons (standard):   rounded-lg
Buttons (pill/CTA):   rounded-full
Input fields:         rounded-lg
Badges / tags:        rounded-full
Small thumbnails:     rounded-lg or rounded-xl
```

### 1.5 Shadow

```
Default card:         border border-slate-200 (no shadow)
Hover state:          hover:shadow-sm hover:border-slate-300
Elevated / modal:     shadow-xl border border-slate-200
Sidebar:              No shadow — it is flush left
```

### 1.6 Icon System

**All navigation icons, section icons, and stat card icons must use SVG.** The project does not currently install an icon library — use inline SVG with `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"`.

Standard icon size in nav: `w-4 h-4`  
Standard icon size in stat cards: `w-5 h-5` inside a `w-9 h-9 rounded-xl` tinted container  
Standard icon size in buttons: `w-4 h-4`

Create a shared icon set in `components/icons.tsx` — see Section 3.1.

### 1.7 Interactive States

```
Link / card hover:     hover:border-brand-green hover:shadow-sm
Button hover:          hover:bg-brand-green-dark (for green buttons)
Nav item hover:        hover:bg-white/10 hover:text-white (on dark sidebar)
Row hover:             hover:bg-slate-50
Disabled:              opacity-50 cursor-not-allowed
Focus:                 focus:outline-none focus:ring-2 focus:ring-brand-green
```

### 1.8 Empty States

Every empty state must have:
1. A centred icon (SVG or emoji, 40–48px container, `bg-slate-100 rounded-full`)
2. A short bold heading
3. One sentence of supporting copy
4. A primary CTA button if there is an action the user can take

Do not use a plain `<p>` tag as an empty state.

### 1.9 Loading / Skeleton States

When data is loading, use a pulsing skeleton placeholder. Pattern:

```tsx
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-slate-200 rounded-full w-3/4" />
  <div className="h-4 bg-slate-200 rounded-full w-1/2" />
</div>
```

### 1.10 Page Header Pattern (updated)

The `PageHeader` component must be updated to use the larger type scale. The updated pattern is:

```tsx
<div className="flex items-start justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
    {description && (
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    )}
  </div>
  {action && <div className="flex-shrink-0">{action}</div>}
</div>
```

### 1.11 Stat Card Pattern (updated)

Every stat card must follow this structure:

```tsx
<div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden hover:shadow-sm hover:border-slate-300 transition-all">
  {/* Optional: top accent bar */}
  <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand-green rounded-t-2xl" />
  
  {/* Icon + trend row */}
  <div className="flex items-start justify-between mb-3">
    <div className="w-9 h-9 rounded-xl bg-brand-green/10 flex items-center justify-center">
      <SomeIcon className="w-5 h-5 text-brand-green" />
    </div>
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

### 1.12 Feed / List Row Pattern

```tsx
<div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer border-l-2 border-transparent hover:border-brand-green">
  <div>
    <p className="text-sm font-semibold text-slate-900">{name}</p>
    <p className="text-xs text-slate-400 mt-0.5">{detail}</p>
  </div>
  <div className="flex items-center gap-2 flex-shrink-0">
    {badge}
    <span className="text-xs text-slate-400">{date}</span>
  </div>
</div>
```

For urgent rows (e.g. meeting requested), use `border-l-2 border-red-400` to create a coloured left border.

### 1.13 Future Feature Checklist

When adding any new page or feature, verify against this list before considering it done:

- [ ] Page title uses `text-2xl font-bold tracking-tight`
- [ ] No emoji used as UI chrome icons
- [ ] All interactive elements have hover and focus states
- [ ] Empty state follows the icon + heading + copy + CTA pattern
- [ ] Stat cards (if any) follow the stat card pattern with SVG icon
- [ ] Any list or feed rows follow the feed row pattern
- [ ] Gold accent used if the feature has a "primary" or "featured" designation
- [ ] Mobile layout tested (sidebar collapses, content doesn't overflow)
- [ ] Loading state considered (skeleton or spinner)

---

## 2. Specific Changes — Ordered by Priority

---

### CHANGE 1 — `components/page-header.tsx`

**What:** Update the h1 from `text-xl` to `text-2xl font-bold tracking-tight`.

**File:** `components/page-header.tsx`

**Current:**
```tsx
<h1 className="text-xl font-semibold text-slate-900">{title}</h1>
```

**Replace with:**
```tsx
<h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
```

This is a global change that improves every single page in the portal.

---

### CHANGE 2 — `components/icons.tsx` (new file)

**What:** Create a shared icon component file so all icons are consistent and easy to reference.

**File:** `components/icons.tsx` (create new)

Create SVG icon components for every nav item and common action. Each icon should accept a `className` prop. Use `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`, `strokeLinecap="round"` as defaults.

Required icons (minimum):
- `DashboardIcon` — grid of four squares
- `LeadsIcon` — group of people
- `FranchiseeIcon` — single person
- `FranchisorIcon` — building / house
- `MatchIcon` — checkmark circle (or target)
- `AgreementIcon` — document
- `MarketplaceIcon` — shopping bag or grid
- `AgentIcon` — handshake
- `QuestionnaireIcon` — clipboard / list
- `BellIcon` — notification bell
- `ChevronDownIcon` — chevron
- `SettingsIcon` — gear / settings
- `SignOutIcon` — log out arrow
- `PlusIcon` — plus
- `SearchIcon` — magnifying glass
- `StarIcon` — star (for primary match badge)
- `CheckIcon` — checkmark
- `ArrowRightIcon` — arrow right

Example structure:

```tsx
export function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
```

---

### CHANGE 3 — `components/nav-sidebar.tsx`

This is the most impactful change. Five sub-changes:

#### 3a. Add icons to every nav item

Import icons from `components/icons.tsx`. Map each nav label to its icon. Update the nav item render to show the icon alongside the label:

```tsx
// In the NavLeaf type, add an optional icon field
type NavLeaf = { label: string; href: string; icon?: React.ReactNode }
```

Update each nav array to include icons:

```tsx
const adminNav: NavItem[] = [
  { label: 'Dashboard',   href: '/admin',            icon: <DashboardIcon className="w-4 h-4" /> },
  { label: 'Leads',       href: '/admin/leads',       icon: <LeadsIcon className="w-4 h-4" /> },
  { label: 'Franchisees', href: '/admin/franchisees', icon: <FranchiseeIcon className="w-4 h-4" /> },
  // groups: add icons to children too
  ...
]
```

Update the nav item link render to include the icon:

```tsx
<Link className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all', ...)}>
  {item.icon && <span className="flex-shrink-0 opacity-70">{item.icon}</span>}
  {item.label}
</Link>
```

Do the same inside `NavGroupItem` for child links (use `text-xs` icon size for sub-items):

```tsx
<Link className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all', ...)}>
  {child.icon && <span className="flex-shrink-0 opacity-60">{child.icon}</span>}
  {child.label}
</Link>
```

#### 3b. Add nav section labels (grouping headers)

Between nav sections, add a small uppercase label to help users orient. Add a `sectionLabel` field to the nav array or use a new type:

```tsx
type NavDivider = { sectionLabel: string }
type NavItem = NavLeaf | NavGroup | NavDivider

function isDivider(item: NavItem): item is NavDivider {
  return 'sectionLabel' in item
}
```

Render dividers as:
```tsx
<p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">
  {item.sectionLabel}
</p>
```

Admin nav structure with dividers:
```
[divider: 'Pipeline']
Dashboard
Leads
Franchisees
[divider: 'Brands']
Franchisors (group)
Matches
Agreements
[divider: 'More']
Agents (group)
Marketplace (group)
```

#### 3c. Move NotificationBell out of nav list and into the sidebar header

Currently `<NotificationBell />` is appended at the bottom of the nav list as if it's a link. Move it to the logo/header area of the sidebar, displayed as a small icon button to the right of the logo.

In the logo div (desktop sidebar), add the bell next to the logo:

```tsx
<div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
  <Link href={`/${profile.role}`}>
    <Image src="/logo-white.png" ... />
  </Link>
  <div className="flex items-center gap-1">
    <NotificationBell compact />  {/* see 3d */}
    <button onClick={() => setMobileOpen(false)} className="md:hidden ...">×</button>
  </div>
</div>
```

#### 3d. Update `NotificationBell` to support a `compact` mode

Add a `compact?: boolean` prop. When `compact={true}`, render just the bell icon button (no text label, no "Notifications" string). Keep all the dropdown logic identical.

```tsx
interface NotificationBellProps { compact?: boolean }

// In the button render:
{compact ? (
  <button ref={btnRef} onClick={handleOpen} className="relative p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
    <BellIcon className="w-4 h-4" />
    {unread > 0 && (
      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#3a4a3a]" />
    )}
  </button>
) : (
  // existing full-width nav-item button
)}
```

Remove `<NotificationBell />` from the nav list in `nav-sidebar.tsx`.

#### 3e. Add role label to user card at sidebar bottom

Below the user's name, show their role in a slightly styled way:

```tsx
<p className="text-white/40 text-[10px] capitalize">{profile.role}</p>
```

Replace the current "Profile & settings" static text with the role name. The profile link is already on the user row — the role context is more useful than the duplicate "Profile & settings" text.

#### 3f. Add subtle gradient to sidebar background

In the `<aside>` element, change `bg-brand-green` to:

```
style={{ background: 'linear-gradient(160deg, #3a4a3a 0%, #2d3d2d 100%)' }}
```

Or add a new Tailwind CSS custom class in `globals.css`:
```css
.sidebar-bg {
  background: linear-gradient(160deg, #3a4a3a 0%, #2d3d2d 100%);
}
```

---

### CHANGE 4 — `app/admin/page.tsx` (Admin Dashboard)

Four sub-changes:

#### 4a. Replace emoji icons with SVG icon components

In the `sections` array, change each `icon` field from an emoji string to a React element using icons from `components/icons.tsx`. Update the card render to use the new icon pattern:

```tsx
// In the sections array:
{ ..., icon: <LeadsIcon className="w-5 h-5 text-red-500" />, iconBg: 'bg-red-50' }

// In the card render, replace:
<span className="text-2xl">{s.icon}</span>

// With:
<div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', s.iconBg)}>
  {s.icon}
</div>
```

Use these icon colour pairings:
- Leads: `text-red-500 bg-red-50`
- Franchisees: `text-brand-green bg-brand-green/10`
- Franchisors: `text-brand-gold` with `bg-brand-gold/10` — important: this is the one place gold appears in stats
- Matches: `text-violet-600 bg-violet-50`
- Marketplace Intros: `text-blue-600 bg-blue-50`

#### 4b. Update page header greeting

Change the static "Dashboard" title to a time-personalised greeting by passing a dynamic title:

```tsx
// In the page component (server component):
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
// Then in PageHeader:
title={`${greeting}, ${adminName?.split(' ')[0] ?? 'there'}`}
description="Here's what needs your attention today."
```

To get the admin name: fetch the admin profile from the existing Supabase client (`supabase.auth.getUser()` is already in scope for admin pages — use the profiles table).

#### 4c. Add left-border highlight to urgent feed rows

In the "Leads needing attention" feed, rows with `status === 'meeting_requested'` should have a visible red left border:

```tsx
<Link
  className={cn(
    'flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors border-l-2',
    lead.status === 'meeting_requested'
      ? 'border-red-400 bg-red-50/30'
      : 'border-transparent'
  )}
>
```

#### 4d. Update stat card number size

Change `text-3xl font-bold` on the stat count number to `text-3xl font-extrabold tracking-tight` and ensure it uses `text-slate-900`. This makes the numbers feel more confident and data-driven.

---

### CHANGE 5 — `app/franchisee/page.tsx` (Franchisee Dashboard — Pre-Assignment State)

This is the most important user-facing empty state in the product. Replace the centred card with a progress checklist:

#### 5a. Replace the pre-assignment card with an onboarding checklist

When `!hasPrimaryBrand`, instead of the current centred paragraph card, render a "Getting started" progress card:

```tsx
{!hasPrimaryBrand && (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Getting started</h2>
        <p className="text-xs text-slate-400 mt-0.5">Your franchise journey</p>
      </div>
      <span className="text-xs font-semibold text-brand-green">
        {completeness >= 100 ? '2 of 3 steps done' : '1 of 3 steps done'}
      </span>
    </div>

    {/* Progress bar */}
    <div className="h-1.5 bg-slate-100 rounded-full mb-5">
      <div
        className="h-1.5 bg-brand-green rounded-full transition-all"
        style={{ width: completeness >= 100 ? '66%' : '33%' }}
      />
    </div>

    {/* Steps */}
    <div className="space-y-3">
      {/* Step 1 — always done (they're logged in) */}
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center flex-shrink-0">
          <CheckIcon className="w-3 h-3 text-emerald-600" />
        </div>
        <p className="text-sm text-slate-500 line-through">Create your account</p>
      </div>

      {/* Step 2 — profile completion */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border',
          completeness >= 100
            ? 'bg-emerald-100 border-emerald-200'
            : 'bg-white border-brand-green'
        )}>
          {completeness >= 100
            ? <CheckIcon className="w-3 h-3 text-emerald-600" />
            : <span className="text-[9px] font-bold text-brand-green">2</span>
          }
        </div>
        <div className="flex-1 flex items-center justify-between gap-3">
          <p className={cn('text-sm', completeness >= 100 ? 'text-slate-500 line-through' : 'text-slate-900 font-medium')}>
            Complete your profile
          </p>
          {completeness < 100 && (
            <Link href="/franchisee/profile" className="text-xs font-semibold text-white bg-brand-green hover:bg-brand-green-dark px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
              {completeness}% done — finish →
            </Link>
          )}
        </div>
      </div>

      {/* Step 3 — waiting for match */}
      <div className="flex items-center gap-3 opacity-50">
        <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
          <span className="text-[9px] font-bold text-slate-400">3</span>
        </div>
        <p className="text-sm text-slate-400">Your first match is revealed</p>
        <span className="text-[10px] text-slate-300 ml-auto">After step 2</span>
      </div>
    </div>
  </div>
)}
```

---

### CHANGE 6 — `app/franchisee/matches/page.tsx` (Journey Page)

#### 6a. Rename "Backup options" section label

Change:
```tsx
'Backup options — in case your primary doesn\'t progress'
```
To:
```tsx
'Your alternative matches'
```

This is friendlier and doesn't pre-frame failure.

#### 6b. Upgrade the `PipelineProgress` component

Replace the current thin flat bar implementation with a connected step indicator. The current implementation uses `h-2` bars with 9px labels. Replace with:

```tsx
function PipelineProgress({ stage }: { stage: string | null }) {
  const currentIdx = JOURNEY_STAGES.findIndex(s => s.value === stage)
  return (
    <div>
      {/* Step dots with connecting lines */}
      <div className="flex items-center gap-0 mb-3">
        {JOURNEY_STAGES.map((s, i) => (
          <React.Fragment key={s.value}>
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                i < currentIdx  ? 'bg-brand-green border-brand-green text-white'
                : i === currentIdx ? 'bg-white border-brand-green text-brand-green ring-4 ring-brand-green/15'
                : 'bg-white border-slate-200 text-slate-300'
              )}>
                {i < currentIdx ? <CheckIcon className="w-3 h-3" /> : i + 1}
              </div>
            </div>
            {i < JOURNEY_STAGES.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 -mt-0',
                i < currentIdx ? 'bg-brand-green' : 'bg-slate-200'
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Current stage label */}
      {currentIdx >= 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm">{JOURNEY_STAGES[currentIdx].emoji}</span>
          <span className="text-sm font-semibold text-slate-800">{JOURNEY_STAGES[currentIdx].label}</span>
          {currentIdx < JOURNEY_STAGES.length - 1 && (
            <span className="text-xs text-slate-400 ml-1">
              → Next: {JOURNEY_STAGES[currentIdx + 1].label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

#### 6c. Add gold accent to primary brand card header

In `BrandCard`, update the primary brand header banner:

```tsx
{isPrimary && (
  <div className="bg-gradient-to-r from-brand-green to-brand-green-dark px-5 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <StarIcon className="w-3.5 h-3.5 text-brand-gold" />
      <span className="text-xs font-semibold text-white">Your primary match</span>
    </div>
    <div className="h-0.5 w-6 bg-brand-gold/50 rounded-full" />
  </div>
)}
```

---

### CHANGE 7 — `app/admin/franchisees/FranchiseeKanban.tsx`

#### 7a. Replace column header dot with top border accent

Remove the `<span className="w-2 h-2 rounded-full" />` dot from column headers.

Instead, add a top border to each column container via `border-t-2`:

```tsx
<div
  key={bucket.key}
  className={cn('flex flex-col min-h-[480px] rounded-xl bg-slate-50/50 p-3 border border-slate-200 border-t-2')}
  style={{ borderTopColor: bucket.accentColor }}
>
```

Add `accentColor` to each bucket definition:
- New: `#38bdf8` (sky)
- Active: `#fbbf24` (amber)
- In Play: `#34d399` (emerald)
- Closing: `#a78bfa` (violet)

#### 7b. Match stage pill colour to column accent colour

Update the stage pill on each card to use a colour derived from its bucket, not the generic `bg-slate-50` it currently uses. Add a `pillClass` field to each bucket:

```
new:      bg-sky-100 text-sky-700
active:   bg-amber-100 text-amber-700
in_play:  bg-emerald-100 text-emerald-700
closing:  bg-violet-100 text-violet-700
```

Pass the bucket's `pillClass` down to the card or derive it by looking up which bucket the stage belongs to.

---

### CHANGE 8 — `components/MarketplaceView.tsx`

#### 8a. Add gold accent strip to partner cards

At the top of each `PartnerCard`, add a 3px gold gradient bar:

```tsx
<div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-gold/30 transition-all flex flex-col">
  {/* Gold accent */}
  <div className="h-[3px] bg-gradient-to-r from-brand-gold to-brand-gold-light rounded-t-xl" />
  ...
</div>
```

#### 8b. Add icon characters to filter pills

Update `SECTOR_ICONS` to use proper Unicode characters and ensure they appear in the filter pills. The current implementation already has icons in `SECTOR_ICONS` — make sure they render visibly in the active/inactive pill states with correct sizing.

#### 8c. Update feature bullet from `✦` to use gold colour

The `✦` character is already in the code. Ensure it uses `text-brand-gold` (not inline hardcoded `text-brand-gold`):

```tsx
<span className="text-brand-gold mt-0.5 flex-shrink-0 flex-shrink-0">✦</span>
```

---

### CHANGE 9 — `tailwind.config.ts`

Add the missing gold-light to the Tailwind config (it's referenced in the brief but not in the current config):

```ts
brand: {
  green: '#3a4a3a',
  'green-dark': '#2a352a',
  'green-light': '#5f725f',
  gold: '#d4a574',
  'gold-light': '#e8c9a0',  // already present — confirm it is
},
```

Confirm `brand-gold-light` is already present. If not, add it.

---

### CHANGE 10 — `components/ui/card.tsx`

Update the base `Card` component border radius from `rounded-xl` to `rounded-2xl` to match the design system. Also update `StatCard` to follow the new stat card pattern:

```tsx
export function StatCard({ label, value, sub, icon, iconBg, trend, alert }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg ?? 'bg-slate-100')}>
            {icon}
          </div>
        )}
        {trend && (
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {alert && (
        <p className="mt-2 text-[11px] font-semibold px-2.5 py-1 rounded-full inline-block bg-amber-50 text-amber-700">
          {alert}
        </p>
      )}
    </div>
  )
}
```

Update `StatCardProps` interface accordingly.

---

## 3. File Change Summary

| File | Type | Priority |
|---|---|---|
| `components/page-header.tsx` | Edit | 🔴 High |
| `components/icons.tsx` | Create new | 🔴 High |
| `components/nav-sidebar.tsx` | Edit | 🔴 High |
| `components/notification-bell.tsx` | Edit | 🔴 High |
| `app/admin/page.tsx` | Edit | 🔴 High |
| `app/franchisee/page.tsx` | Edit | 🔴 High |
| `app/franchisee/matches/page.tsx` | Edit | 🟡 Medium |
| `app/admin/franchisees/FranchiseeKanban.tsx` | Edit | 🟡 Medium |
| `components/MarketplaceView.tsx` | Edit | 🟡 Medium |
| `components/ui/card.tsx` | Edit | 🟡 Medium |
| `tailwind.config.ts` | Edit (verify) | 🟢 Low |

---

## 4. What NOT to Change

- Do not touch any Supabase queries, data fetching logic, or API routes
- Do not change any authentication or routing logic
- Do not change the middleware
- Do not add new npm packages — all icons should be inline SVG
- Do not change the email templates in `lib/email/`
- Do not change the PDF generation in `lib/pdf/`
- Do not change the questionnaire components in `components/questionnaire/`
- The mobile sidebar behaviour (hamburger, backdrop, slide-in) is correct — only update its visual styling

---

## 5. Testing Checklist

After completing all changes, manually verify:

- [ ] Admin dashboard loads with SVG icons (no emoji in stat cards)
- [ ] Sidebar shows icons on every nav item across all four roles (admin, franchisee, franchisor, introducer)
- [ ] Notification bell appears in sidebar header area, not in the nav list
- [ ] Notification bell shows unread count badge when there are unread notifications
- [ ] Page titles across all pages are visibly larger and bolder than before
- [ ] Franchisee pre-assignment state shows the progress checklist, not the old centred card
- [ ] Franchisee journey page shows the new step-dot pipeline indicator
- [ ] "Backup options" label has been renamed to "Your alternative matches"
- [ ] Admin dashboard urgent leads have red left border
- [ ] Kanban columns have top colour borders (not dots)
- [ ] Partner cards have gold accent strip at top
- [ ] No TypeScript type errors (`npx tsc --noEmit`)
- [ ] No console errors on any portal page
- [ ] Mobile sidebar still opens and closes correctly

---

## 6. Design Principles for Future Features

Whenever a new feature is added to the portal, it should be evaluated against these principles before shipping:

### Does it feel earned?

Premium products earn trust through consistency. Every new page should feel like it belongs to the same family as every other page. Use the typography scale, colour palette, and component patterns defined in Section 1 — never invent new visual treatments for a single page.

### Does it guide the user?

The portal exists to guide people through a high-stakes financial decision. Every page should answer the question: "What should I do next?" If a page doesn't have a clear next action, add one. Empty states, in particular, should always have a CTA.

### Does it respect the brand?

The brand is warm, authoritative, and premium — not flashy. The green is deep and considered, not bright SaaS green. The gold is warm and hospitality-adjacent. When in doubt: less colour, more white space, more confident type.

### Is it mobile-ready?

A significant portion of franchisee and introducer users will access the portal on mobile. Every new layout must be tested at 375px width. The sidebar collapses correctly — ensure new page content doesn't break at mobile widths. Use `grid-cols-1 sm:grid-cols-2` patterns, not fixed-width layouts.

### Does it use the right component?

Before building a new UI pattern, check whether an existing component covers it:
- Page container with title + optional action → `PageHeader`
- White bordered box → `Card`
- Count display with label → `StatCard`
- Status pill → `Badge` / `statusBadge`
- Inline SVG icon → `components/icons.tsx`

If a new pattern is needed more than once, build it as a shared component in `components/ui/`.
