# The Foundry: Build 1 plan

Source of truth for the build. Design content comes from the canvas "The Foundry: Build 1"
(https://claude.ai/artifact/Wo3dm33C28MJ1pZfXwr5rX, 15 boards). Build, flow, data, integrations
and automations are decided here. UK English throughout.

Note: `claude/foundry-build1-handoff.md` was referenced in the brief but isn't in the repo on any
branch, so this plan is built from the canvas plus the current code.

---

## 0. Where it lives

| Surface | Lives in | URL |
|---|---|---|
| Public Foundry (Search, Results, Browse, Partner, Intro, Apply) | `portal/app/(public)/foundry/*` | `portal.franchisefoundry.co.uk/foundry` |
| Member portal (Ask, Picked for you, My intros) | `portal/app/franchisee/*` | signed in |
| Admin (Applications, Partners, Intros, Insights) | `portal/app/admin/*` | signed in, admin |
| Marketing site | static HTML, root of repo | `franchisefoundry.co.uk` gets nav links in |

Why the portal and not the static site: the canvas rule is "one component set". Search, result
cards and partner profiles are React components rendered twice: inside a public header and
inside the sidebar shell. The `(public)` route group already does this for `/get-matched`, so we
follow the same pattern. The static site gets "Foundry Search" and "Become a partner" nav links,
the same way "Find Your Match" already points at the portal.

Brand tokens already match the design: `--ff-green #3a4a3a`, `--ff-gold #c8924a`, Sora. The design
also uses IBM Plex Mono for readouts, scores and timestamps; we add it as `font-mono`.

---

## 1. Design board → existing code

| Board | Existing | Plan |
|---|---|---|
| Flow map | n/a | This doc |
| 01 Search | Nothing | **New** `(public)/foundry/page.tsx`, `components/foundry/SearchBox.tsx` (input, live "Understood" readout, "People are asking"), `StatsStrip` (live counts, not hard-coded) |
| 02 Results | `MarketplaceView.tsx` has search/filter/cards but is **built and unused** (both marketplace pages show `ComingSoon`) | **New** `(public)/foundry/search/page.tsx`; `QueryChips`, `ResultGroup`, `ResultCard` (fit score, why-it-fits ticks, deal), `IntroList` (basket), `GapCard`. Basket in a React context, kept in `localStorage` so it survives sign-up |
| 03 The Foundry (browse) | `MarketplaceView.tsx` + `lib/partner-categories.tsx` (9 categories, matches design exactly) | **Evolve** `MarketplaceView` into `FoundryDirectory`: category tiles, sticky filters (region, deals, replies within 8h, works with franchisors), deals strip, intro-list buttons |
| 04 Partner profile | `PartnerDetailDrawer.tsx` (slide-over) | **New full page** `(public)/foundry/[slug]` (shareable, indexable). Lift the drawer's sections into it, add Our take, services, FAQ, feedback, sticky deal + intro card. Drawer stays as quick view in admin |
| 05 Request intros + tracker | `RequestIntroModal` in `MarketplaceView`, `POST /api/intro-requests` (one partner, signed in only) | **Replace** with `IntroRequestForm` (many partners, one need per partner, shared plan chips, call time, consent) + `IntroTracker`. New endpoint, guest-capable |
| 06 Become a partner | Nothing | **New** `(public)/foundry/apply` multi-step form. Phase 4 |
| P1 Ask (portal home) | `FranchiseeHomeView.tsx` | **Add** `AskPanel` (same `SearchBox`, plan chips from `franchisee_profiles`, live one-click intros) to the top of the existing home. Don't throw the current dashboard away; jump tiles replace the lower half once My intros exists |
| P2 Picked for you | `/franchisee/marketplace` = `ComingSoon` | **Replace** with stage-based picks + `FoundryDirectory` in the sidebar shell |
| P3 Partner in portal | n/a | Same `[slug]` component under `/franchisee/foundry/[slug]`, button becomes one-click |
| P4 My intros | Nothing (closest: `crm/StageTracker`, `crm/ThreadPanel`, DM system) | **New** `/franchisee/intros`: list + detail, 4-step progress via `StageTracker`, timeline from `intro_events`, private rating, "Message us" via existing DMs |
| A1 Applications | Nothing (pattern: franchisor review flow with needs_info/rejected) | **New** `/admin/foundry/applications`: 6-point checklist, Approve locked until 6/6, trust level, deal |
| A2 Partners + A2b Editor | `admin/partners/PartnersClient.tsx` (CRUD, ordering, active toggle) + `/api/admin/partners` | **Extend**: KPI strip, trust level, reply time, conversion, live/paused tabs. Editor gets the live preview + "test a search" panel from the canvas |
| A3 Intro requests | `admin/intro-requests/page.tsx`, a card grid with a 3-value status dropdown | **Rebuild** on `components/admin/KanbanBoard.tsx` + `crm/RecordDrawer`: 4 columns, SLA ages, prefilled briefing email, Brief / Chase / advance actions |
| A4 Search insights | `admin/analytics` (general) | **New** `/admin/foundry/insights`: funnel, unanswered searches, demand vs supply, partner performance |

Nav changes:
- Franchisee sidebar: `Dashboard` becomes **Ask**, `Marketplace` becomes **The Foundry**, add **My intros** (with live count). Keep My Journey, Meetings, Messages, Profile. "Member deals" and "Launch plan (Soon)" come later.
- Admin sidebar: replace the single "Marketplace" item with a **The Foundry** group: Partners, Applications, Intro requests, Search insights, Resales. Drop `MarketplaceTabs`.
- Middleware: add `/foundry` and `/api/foundry` to `publicPaths`.

### Live bug found on the way

`app/admin/intro-requests/page.tsx` selects `partners(name, sector)`. Migration 003 renamed
`sector` to `category`, so the query errors and the page always shows "No intro requests yet."
Any intro a member has sent since August isn't visible to admin. One-line fix
(`partners(name, category)`); first commit of the build.

---

## 2. Data model

One new migration, `portal/supabase/migrations/008_foundry_build1.sql`.

### 2.1 `partners` (extend)

```
trust_level      text  check in ('listed','trusted','recommended')  default 'listed'
status           text  check in ('draft','live','paused')            -- replaces is_active (kept in sync for now)
our_take         text                                                -- "Our take" on the profile
services         jsonb default '[]'   -- [{title, description, price}]
faqs             jsonb default '[]'   -- [{q, a}]
regions          text[] default '{}'  -- 'uk', 'nw', 'lon', 'scot'... (UK-wide = 'uk')
base_location    text                 -- "Manchester"
price_from       text                 -- "From £99/month"
budget_min_gbp   int, budget_max_gbp int   -- for funding/fit-out range fit
sectors          text[] default '{}'  -- coffee, qsr, fitness... (experience)
keywords         text[] default '{}'  -- search synonyms, admin-editable
client_count     int
deal_value_gbp   int                  -- powers "~£1.5k saved"
deal_terms       text                 -- small print
```
`features` (existing) stays as the facts row. `offer_text` (existing) is the deal headline.

### 2.2 `partner_contacts` (new, admin-only RLS)

Who we brief. Kept out of `partners` so nothing private can leak through public reads.
```
partner_id, name, email, phone, role, is_primary
```

### 2.3 `intro_batches` (new): one submission, many partners

```
id, member_id → profiles, search_id → search_events (nullable),
context jsonb      -- snapshot of plan chips at send: brand, area, budget, stage
call_time text     -- mornings | afternoons | evenings
consent_at timestamptz, verified_at timestamptz,
source text        -- 'public' | 'portal'
```

### 2.4 `intro_requests` (evolve existing)

```
batch_id      → intro_batches
need          text        -- per-partner "what do you need from them" (existing `message` migrates here)
stage         text check in ('awaiting_verification','to_brief','briefed','in_contact','outcome','closed','withdrawn')
briefed_at, contacted_at, outcome_at, closed_at timestamptz
sla_due_at    timestamptz -- brief by (4 working hours), then contact by (24h after brief)
chased_at     timestamptz
brief_email   text        -- what we actually sent
outcome       text check in ('hired','not_hired','undecided')
member_rating text check in ('going_well','slow','not_fit')   -- private to us
contact_revealed boolean default false
```
Existing `status` maps across: pending → to_brief, sent → briefed, completed → closed. Drop `status` once code is moved.

### 2.5 `intro_events` (new): the timeline

```
intro_request_id, kind, actor_id, body, visible_to_member boolean, created_at
```
Every admin move writes one row. The member's "Updates" list is `visible_to_member = true`. Admin
gets the full audit trail.

### 2.6 `search_events` and `foundry_events` (new): feeds Insights

```
search_events: id, session_id, user_id null, surface ('public'|'portal'),
               raw_query, parsed jsonb, partner_ids uuid[], result_count,
               unmet_needs text[], parser ('rules'|'ai'), created_at
foundry_events: id, session_id, user_id null, kind ('profile_view'|'add_to_list'|'gap_request'),
                partner_id null, search_id null, created_at
```
Funnel = searches → profile views → intro requests → introduced (briefed) → work won (outcome hired).
`session_id` is a first-party cookie; no third-party tracking.

### 2.7 `partner_applications` (new, Phase 4)

```
business fields, category, regions, client_refs jsonb, documents (storage paths),
proposed_deal, status ('new','vetting','needs_info','approved','rejected'),
checks jsonb  -- {companies_house, insurance, regulator, references, founder_call, profile}: {done, by, at, note}
trust_level, partner_id (set on approval)
```

### 2.8 `partner_stats` (view)

Intros, conversion (hired / introduced), median reply (contacted_at minus briefed_at), latest
rating mix. Read by A2, A4 and the "replies ~6h" line on public cards.

### RLS summary

- Public (anon) reads `partners` where `status = 'live'` only. No contacts, no stats beyond reply time.
- Members read their own batches, requests, and `visible_to_member` events. Contact details
  surface only when `contact_revealed`.
- Admin: everything. All writes from public go through route handlers with the service client.

---

## 3. API routes

Same pattern as today: Next route handlers, `createClient()` for session, `createAdminClient()`
for privileged writes, `notify()` for in-app + email + push.

### Public (no auth, rate limited per IP + session)

| Route | Does |
|---|---|
| `GET /api/foundry/parse?q=` | Fast parse for the live "Understood" readout as they type (rules only, <50ms) |
| `POST /api/foundry/search` | `{q, ctx}` → `{understood, summary, groups[], alsoNeed[], gaps[], searchId}`. Logs `search_events` |
| `GET /api/foundry/partners` | Directory with filters + sort |
| `POST /api/foundry/events` | Beacons: profile view, add to list |
| `POST /api/foundry/intros` | Guest or member. `{partners:[{id, need}], ctx, callTime, name, email, consent, searchId}` |
| `POST /api/foundry/gap` | "Ask us to source one" → outreach item + admin notification |
| `POST /api/foundry/apply` | Partner application (Phase 4) |

### Member

| Route | Does |
|---|---|
| `POST /api/foundry/intros` | Same endpoint; signed in = one click, no form, `verified_at` set immediately |
| `POST /api/member/intros/[id]/rating` | Private rating + optional note |
| `POST /api/member/intros/[id]/withdraw` | Withdraw consent for one partner |
| Messages | Existing `/api/dm`, tagged with the intro id |

### Admin

| Route | Does |
|---|---|
| `GET /api/admin/foundry/intros` | Board data with SLA state |
| `POST /api/admin/foundry/intros/[id]/brief` | Send the (edited) briefing email to the partner contact via Resend, stage → briefed, event, notify member |
| `POST /api/admin/foundry/intros/[id]/advance` | → in_contact (reveals contact to member) → outcome → closed |
| `POST /api/admin/foundry/intros/[id]/chase` | Chase email to partner, `chased_at` |
| `/api/admin/partners` (+`[id]`) | Existing, extended for new fields + contacts |
| `/api/admin/foundry/applications` (+`[id]`, `[id]/approve`) | Phase 4 |
| `GET /api/admin/foundry/insights?period=` | Funnel, gaps, demand vs supply |

### Automations (Netlify scheduled function, every 15 min)

- Brief SLA: unbriefed after 3h → admin push; after 4 working hours → red everywhere.
- Contact SLA: briefed 24h with no contact → auto-draft chase, admin push.
- Outcome nudge: in_contact for 7 days → email member "How did it go?".
- Unverified guest intros: reminder at 24h, expire at 7 days.

Working hours: Mon to Fri, 9 to 6, UK time, bank holidays excluded.

---

## 4. The flow, and where I'd change it

**Public:** search or browse → add partners to the intro list → one form → "Requests sent" →
tracker. No sign-up wall. All good, three changes:

1. **Verify email before we brief anyone.** The canvas sends straight away. If we don't verify, anyone
   can type someone else's email and we pass that person's details to five partners. That's a
   GDPR problem and a trust problem. Fix: the first intro creates the account and sends a magic
   link; requests sit in `awaiting_verification` until it's clicked. The tracker shows "Confirm
   your email" as step 0. Signed-in members skip this.
2. **No password step for Foundry sign-ups.** Middleware currently forces `/setup-account` for
   anyone with `setup_complete = false`. The magic link should land them straight on My intros.
   We mark Foundry sign-ups as set up and offer "set a password" later in Profile.
3. **Existing email = sign in, not a new account.** If the email already has a portal account we
   attach the batch to it after verification and say "Welcome back".

**Foundry members feed the main funnel.** A Foundry sign-up is a franchisee with
`pipeline_stage = 'new_enquiry'` and `source = 'foundry'`. Someone asking for funding for a coffee
franchise without a brand is a candidate. Admin sees them in Franchisees, and the Ask home nudges
them to `/get-matched`. This is how the marketplace pays for itself.

**Admin loop:** To brief → Briefed → In contact → Outcome → Closed. Each move writes an event the
member sees. Unanswered searches and "source one" requests land in Insights → outreach →
Applications → live partner. Closed loop, as per the canvas.

**Ranking rule, in code:** order is fit only. Deals, trust level and anything commercial never
changes order. Trust level is a badge, not a boost. Matches the canvas line "payment never changes order".

---

## 5. Build order

Each phase ships on its own and is usable.

### Phase 1: Search, Results, Intro (public)

1. Fix the admin intro-requests query bug.
2. Migration 008 (partners extend, contacts, batches, requests evolve, events, search/foundry events). Backfill the 6 partners with regions, keywords, sectors.
3. `lib/foundry/parse.ts`: rules parser. Needs (category synonyms), UK place → region gazetteer, budget (`£120k`, `120,000`, `around 120`), sector words, stage hints. Unit tested.
4. `lib/foundry/rank.ts`: score = category match (gate) + region coverage + budget range + sector experience + reply time. "Also need" rules by stage (funding → legal, insurance). Templated summary sentence.
5. `/api/foundry/parse`, `/api/foundry/search`, `/api/foundry/events`.
6. Components: `SearchBox`, `UnderstoodBar`, `QueryChips`, `ResultCard`, `ResultGroup`, `GapCard`, `IntroList` + basket context.
7. Pages: `/foundry` (Search), `/foundry/search` (Results). Public header per canvas.
8. `IntroRequestForm`, `IntroTracker`, `/api/foundry/intros` (guest + member, verification, account creation, consent, admin notify).
9. Website nav links + `robots`/sitemap for `/foundry`.

### Phase 2: My intros (member)

1. `/franchisee/intros` list + detail, `StageTracker`, timeline, private rating, message us.
2. `AskPanel` on the franchisee home, plan chips from profile, one-click intros.
3. Nav changes. `/franchisee/marketplace` becomes Picked for you + `FoundryDirectory`.
4. Notification events: `intro_briefed`, `intro_contacted`, `intro_outcome_nudge` added to `lib/notification-events.ts`.

### Phase 3: Admin intro pipeline

1. Rebuild `/admin/intro-requests` as the kanban with SLA ages and overdue states.
2. Record drawer: their message, plan tags, editable briefing email (template first), Brief / Chase / advance.
3. `partner_contacts` editing in the partner admin.
4. Scheduled SLA function.

### Phase 4: the rest

Browse page + Partner profile page (full), Partner admin KPIs + editor preview, Applications
vetting, Become a partner, Search insights.

Rough sizing at the pace we've been going: Phase 1 is the biggest (about 40% of the work),
Phases 2 and 3 are about 20% each, Phase 4 the remainder.

---

## 6. AI: where it earns its place

Principle: **AI reads and writes words; rules and data decide who's shown.** AI never invents a
partner, a price or a deal, and never changes ranking order on its own. Everything it says is
grounded in fields we store. If it fails or is slow, the rules path answers.

| # | Where | What it does | Model | When |
|---|---|---|---|---|
| 1 | Search submit | Turns messy English into the structured query (`needs[]`, sector, area, budget, timing, stage). Handles "someone to look over the lease and sort insurance before I get the keys" where rules miss | Haiku (`claude-haiku-5-5`), structured output, ~1s timeout, fall back to rules | Phase 1b, right after rules ship |
| 2 | Results | The one-paragraph summary and the why-it-fits ticks, written only from the partner's stored facts and the parsed query | Haiku | Phase 1b |
| 3 | Recall | Embeddings over partner profiles + services (pgvector in Supabase) so "kiosk build" finds a shopfitter without us typing every synonym. Rules still gate and score | Embeddings | When partners > ~20 |
| 4 | Admin brief | Drafts the briefing email from member plan + need. Admin always edits and sends | Sonnet (`claude-sonnet-5-5`) | Phase 3 |
| 5 | Insights | Clusters unanswered searches into recruit themes ("North West property, 18 asks") | Sonnet, nightly batch | Phase 4 |
| 6 | Applications + editor | Drafts a partner profile, services and FAQ from their website and application, like `import-article` already does for blog posts | Sonnet | Phase 4 |
| 7 | Launch plan | "Plan my launch" tab. Parked per the canvas; this is the big one later | n/a | Later |

Things to agree before turning any of it on:

- **Live readout stays rules-based.** Calling a model on every keystroke is slow and wasteful. AI
  runs on submit.
- **Log the parser.** `search_events.parser` records rules vs AI so we can see whether AI
  actually improves matches before paying for it on every search.
- **Privacy notice update.** We'd be sending search text (sometimes with names or budgets) to an
  AI provider. One paragraph in `/privacy`, and no member profile data goes to the model on the public side.
- **No advice.** Prompts block financial or legal advice ("you should borrow X"). It describes
  partners; it doesn't advise.
- **Key and cost.** `ANTHROPIC_API_KEY` already exists for the article importer (Netlify env on the
  website). The portal needs its own. Haiku per search is cheap, but we cap per session anyway.

---

## 7. Open decisions (my defaults in bold)

1. **Results page theme.** The canvas Results board is dark (`#18211B`); every other board is light,
   and the same component renders inside the light portal shell. **Default: build it light, keep the
   dark palette as a theme we can switch on for the public page only.**
2. **Hosting.** **Default: portal subdomain** (`portal.franchisefoundry.co.uk/foundry`). Moving to
   `franchisefoundry.co.uk/foundry` later needs a proxy and a Next `basePath`.
3. **Stats strip.** Canvas shows "6 vetted partners · 3 deals · ~£1.5k · £0". **Default: live from
   the DB, hidden until we have 10+ partners** so it doesn't undersell.
4. **Email verification before briefing.** **Default: yes** (see §4).
5. **Funding partners and FCA.** Introducing people to lenders can count as credit broking where
   the borrower is an individual or small partnership and the loan is regulated. Worth a quick check
   with whoever advises us before Capital Forge-style partners go live publicly. Not a build blocker.
