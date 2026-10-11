# The Foundry: Build 1 plan (v3)

Source of truth for the build. Design content comes from the canvas "The Foundry: Build 1"
(https://claude.ai/artifact/Wo3dm33C28MJ1pZfXwr5rX, 15 boards). Build, flow, data, integrations
and automations are decided here. UK English throughout.

**v3 model:**
- **The portal is the source of truth.** It owns the data, the search engine, the APIs and the
  admin. Franchisees, franchisors and agents get the full marketplace inside their portal.
- **The website is a thin, standalone front end** for one-off visitors. No account. It calls the
  portal's public Foundry API.
- One engine, one intro pipeline, one set of partner data. Two shop fronts.

---

## 0. Architecture

```
 franchisefoundry.co.uk/foundry              portal.franchisefoundry.co.uk
 (one-off visitors, no account)              (members + admin, source of truth)
 ┌──────────────────────────────┐            ┌─────────────────────────────────────┐
 │ static pages + foundry.js    │            │ Members:  Ask · Results · Browse     │
 │ Search · Results · Browse    │  HTTPS     │           Partner · My intros        │
 │ Profile · Intro · Tracker    │──────────► │ Admin:    Partners · Applications    │
 │ Become a partner             │  public    │           Intro pipeline · Insights  │
 └──────────────────────────────┘  Foundry   │ API:      /api/foundry/* (engine)    │
       ▲  build-foundry.mjs         API      └──────────────────┬──────────────────┘
       └── pulls live partners at deploy                        │
           (rebuild hook on partner save)                  Supabase
```

- Engine (`portal/lib/foundry/parse.ts`, `rank.ts`) lives once, in the portal.
- `/api/foundry/*` is public, CORS-limited to `franchisefoundry.co.uk`, rate limited. Members hit
  the same routes with their session, which unlocks plan context and one-click intros.
- Website: static HTML + one vanilla JS module, same as the rest of the site. Partner profiles
  are generated at deploy by `build-foundry.mjs` (same pattern as `build-articles.mjs`) for SEO.
- Brand: green `#3a4a3a`, gold `#c8924a`, Sora, IBM Plex Mono for scores. Light throughout.

---

## 1. Who sees what

| | Website visitor | Franchisee (portal) | Franchisor (portal) | Agent (portal) | Admin |
|---|---|---|---|---|---|
| Search, results, browse, profiles | Yes | Yes, plan applied | Yes, brand applied | Yes | Preview |
| Partners shown | All live | `audience` franchisee/both | `audience` franchisor/both | All, filter by audience | All |
| Request intro | Form + email verify | One click | One click | On behalf of a lead (Phase 5) | n/a |
| Track intros | Tracker link by email | My intros | My intros | My clients' intros | Pipeline |
| Updates | Email | In-app + push + email (existing `notify()`) | Same | Same | Push on SLA |
| Member deals | Yes | Yes | Yes | Yes | Sets them |

Plan context (the switch-off-able chips):
- **Franchisee:** brand (assigned franchisor), area (`preferred_locations`), budget
  (`investment_min/max`), stage (`pipeline_stage`).
- **Franchisor:** brand, sector, territories open, stage (recruiting, launching, scaling).
- **Agent:** the selected lead's details.

---

## 2. Design board → build

### Shared (portal components, used by members; website mirrors the markup)

`SearchBox`, `UnderstoodBar`, `PlanChips`, `QueryChips`, `ResultCard`, `ResultGroup`, `GapCard`,
`IntroList`, `PartnerProfile`, `FoundryDirectory`, `IntroProgress`, `IntroTimeline`.

### Member portal

| Board | Existing | Plan |
|---|---|---|
| P1 Ask | `FranchiseeHomeView`, franchisor home | **Add** Ask panel to the top of each role's home; jump tiles below |
| 02 Results (in shell) | `MarketplaceView.tsx` built, unused | **New** `/{role}/foundry/search` |
| P2 Picked for you / 03 Browse | `/franchisee/marketplace`, `/franchisor/marketplace` = `ComingSoon` | **Replace** with stage picks + `FoundryDirectory` (evolved from `MarketplaceView`) |
| 04/P3 Partner profile | `PartnerDetailDrawer` | **New** `/{role}/foundry/[slug]`, one-click intro |
| P4 My intros | Nothing | **New** `/{role}/intros`: progress, timeline, contact revealed, private rating, message us (existing DMs) |
| Nav | "Marketplace" item per role | **The Foundry** + **My intros** (live count) for franchisee, franchisor, agent |

### Website

| Board | Page |
|---|---|
| 01 Search | `foundry/index.html` |
| 02 Results | `foundry/search.html?q=` |
| 03 Browse | `foundry/browse.html` (built at deploy) |
| 04 Partner | `foundry/<slug>.html` (built at deploy) |
| 05 Intro + tracker | Slide-over form; `foundry/track.html?t=` |
| 06 Become a partner | `foundry/apply.html` |
| Nav | "The Foundry" in main nav, homepage search section, "Members: open in your portal" link |

### Admin (portal)

| Board | Existing | Plan |
|---|---|---|
| A1 Applications | Nothing | **New** `/admin/foundry/applications` |
| A2 Partners + editor | `PartnersClient.tsx` | **Extend**: trust, audience, stats, contacts, live preview, rebuild hook |
| A3 Intro requests | `admin/intro-requests` (**broken**, see below) | **Rebuild** as SLA kanban. Each card shows source (website / portal / agent) and links to the member's CRM record |
| A4 Search insights | Nothing | **New**, split by channel and role |
| Nav | "Marketplace" + `MarketplaceTabs` | **The Foundry** group |

### Live bug

`portal/app/admin/intro-requests/page.tsx` selects `partners(name, sector)`; migration 003 renamed
`sector` to `category`, so the page always shows "No intro requests yet." One-line fix, first commit. (Live DB has 0 intro requests, so nothing has been missed yet.)

---

## 3. Data model

Migration `portal/supabase/migrations/008_foundry_build1.sql`.

- **`partners` (extend):** `trust_level`, `status` (draft/live/paused), `our_take`, `services`,
  `faqs`, `regions`, `base_location`, `price_from`, `budget_min_gbp/max_gbp`, `sectors`, `keywords`,
  `client_count`, `deal_value_gbp`, `deal_terms`. `audience` (existing) now actually filters results.
- **`partner_contacts` (new, admin only):** who we brief.
- **`foundry_contacts` (new):** one-off website users, keyed by email. `profile_id` set when the
  email belongs to (or later becomes) a portal user.
- **`intro_batches` (new):** one submission, many partners.
  `requester_profile_id` (members) **or** `contact_id` (website), `on_behalf_of_lead_id` (agents),
  `source` (`website`/`portal`/`agent`), `context` snapshot, `call_time`, `consent_at`,
  `verified_at` (website only; members are pre-verified), `tracker_token_hash` (website only).
- **`intro_requests` (evolve):** `batch_id`, `need`, `stage`
  (awaiting_verification → to_brief → briefed → in_contact → outcome → closed, plus withdrawn/expired),
  timestamps, `sla_due_at`, `brief_email`, `outcome`, `rating`.
- **`intro_events` (new):** timeline + audit, `visible_to_requester`.
- **`search_events`, `foundry_events` (new):** insights; `profile_id` null for visitors, plus `role`.
- **`partner_applications` (new):** vetting.
- **`partner_stats` (view).**

**Identity rule:** the portal profile wins. When a website contact's email matches a portal user
(now or later, on sign-up), their batches attach to that profile and show in My intros.

---

## 4. API (all in the portal)

**Public + member (`/api/foundry/*`, CORS for the website, rate limited):**
`parse`, `search`, `partners`, `partners/[slug]`, `events`, `intros` (visitor = verify flow;
member = one click), `verify`, `track`, `feedback`, `withdraw`, `gap`, `apply`.

**Member:** `GET /api/foundry/my-intros`, rating, withdraw, message (existing DMs).

**Admin:** `/api/admin/foundry/intros/[id]/{brief,advance,chase}`, `contacts/[id]/convert`,
`applications`, `insights`; `/api/admin/partners` extended (fires website rebuild hook).

**Automations (Netlify scheduled function on the portal):** brief SLA (4 working hours), chase at
24h, outcome nudge at 7 days, unverified expiry at 7 days.

---

## 5. Suggested changes (consolidated)

Carried over:
1. **Email verification before briefing**: website visitors only. Members are already verified. *(Agreed)*
2. **No accounts on the website**: tracker link replaces login. *(Agreed)*
3. **Fix the admin intro bug first.**
4. **Ranking is fit only.** Deals, trust and commercial terms never change order.
5. **Light theme** for Results, matching both surfaces.
6. **Stats strip live**, hidden until 10+ partners.
7. **FCA check** on funding partners (credit broking) before lenders go live publicly.

New with v3:
8. **Engine and API live once, in the portal.** The website is a thin client. No logic in two places.
9. **One intro pipeline, tagged by source.** Admin works website, portal and agent intros on one board.
10. **Audience-aware results.** Franchisors see franchisor partners (franchise law, recruitment
    marketing, ops tech); franchisees see theirs. `audience` already exists on partners.
11. **Website history follows the person.** One-off user later joins the portal: past intros
    appear in My intros automatically (email match, verified).
12. **Member intros enrich the CRM.** A franchisee requesting funding is a signal: log it on their
    record and nudge their pipeline stage. Admin sees intros on the franchisee/franchisor record.
13. **Agents intro on behalf of a lead.** Picks a lead, requests intros for them, attributed to the
    agent. Opens a referral/commission angle with partners. Phase 5.
14. **Deals for everyone who comes through us**, website or portal. It's the reason to use us
    over Googling. Portal-only extras can come later as a reason to join.
15. **Website visitors get a soft route in:** confirmation and tracker pages carry "Get matched" and
    "Save this to a free account". Optional, never a wall.
16. **Partner reply data powers the badges.** "Replies ~6h" comes from real `partner_stats`, not typed in.

---

## 6. Build order

1. **Foundations:** bug fix, migration 008, engine (parse + rank, unit tested), `/api/foundry/search`, seed demo data.
2. **Search, Results, Intro in the portal (franchisee first, then franchisor):** Ask panel, results
   page, intro list, one-click intros, partner profile.
3. **My intros** for franchisee and franchisor, with notifications.
4. **Admin intro pipeline:** SLA kanban, briefing email, contacts, automations.
5. **Website front end** on the same API: Search, Results, intro + verification, tracker, nav.
   Build hook + generated profiles and browse.
6. **Supply side + insights:** Become a partner, Applications, Search insights, partner admin extensions.
7. **Agents:** intro on behalf of a lead.

Why portal first: auth already exists (no verification flow needed to test the engine), it's where
the data and admin live, and the website then becomes a straight reskin of a working API.

---

## 7. Demo: private preview on the live sites

No separate database, branch or thread. Everything ships to the real website and portal, switched
off for everyone except named people (Harry, plus Ben if wanted). Launch = flip one setting.

Live DB check (Oct 2026): the 6 canvas sample partners are already in `partners` (active), 0 intro
requests, members' marketplace pages still show "Coming soon". Nothing is exposed today.

**The switch**
- `FOUNDRY_MODE` env var on both Netlify sites: `off` | `preview` | `live`. Starts at `preview`.
- `FOUNDRY_PREVIEW_EMAILS` env var (portal): who can see it. Kept out of the code.

**Portal**
- In `preview`, every Foundry route, nav item and Ask panel renders only for allowlisted accounts.
  Everyone else sees exactly what they see today (Coming soon).
- Seeing other roles: the existing admin "View as" (impersonate) + preview banner lets Harry walk
  through as a demo franchisee, franchisor or agent.

**Website**
- `/foundry` pages deploy but aren't linked, are `noindex`, and are left out of the sitemap.
- A private link (`/foundry/?preview=<secret>`) sets a preview cookie. Without it the pages show
  "Coming soon" and the public Foundry API refuses requests.
- Partner profile pages aren't generated until `live`.

**Demo data, safely in the live DB**
- `is_demo boolean` on partners, foundry_contacts, intro_batches, intro_requests, search_events and
  on demo personas (Sarah Ahmed, Tom Reid, Priya Shah, a demo franchisor, a demo agent).
- Demo rows show only in preview mode and are excluded from real admin lists, analytics, CRM
  counts and insights.
- Any email triggered by demo data goes to Harry, never to a partner or the demo person.
  Push and in-app notifications for demo data go to Harry only.
- `scripts/foundry-demo.sql`: seed, reset, and a one-line purge before launch.

**Deploying**
- Work stays on this branch and goes to `main` in small PRs (each one invisible to the public
  because of the switch). Netlify deploys `main` to both sites as today.
- Optional: enable Netlify branch deploys to preview a PR before merging.

**Go live:** purge demo rows, add real partners, set `FOUNDRY_MODE=live` on both sites, add nav links.

Meanwhile the canvas stays the clickable design reference.

---

## 8. AI

Unchanged in principle: **AI reads and writes words; rules and data decide who's shown.** Never
invents partners, prices or deals; never changes order; rules fallback.

| # | Where | What | Model | Phase |
|---|---|---|---|---|
| 1 | Search submit (both surfaces) | Messy English → structured query | Haiku (`claude-haiku-5-5`) | 2b |
| 2 | Results | Summary + why-it-fits, from stored facts only | Haiku | 2b |
| 3 | Members | Uses their plan (brand, stage, budget) to suggest "you'll also need" | Haiku | 3 |
| 4 | Admin | Drafts briefing emails | Sonnet (`claude-sonnet-5-5`) | 4 |
| 5 | Insights | Clusters unanswered searches into recruit themes | Sonnet | 6 |
| 6 | Applications | Drafts partner profiles from their site | Sonnet | 6 |
| 7 | Plan my launch | Parked | n/a | Later |

Before switching on: live readout stays rules-based; log rules vs AI; privacy notice paragraph;
no financial or legal advice; portal needs its own `ANTHROPIC_API_KEY`; per-session caps.
Member profile data only goes to the model for signed-in members, never on the website.
