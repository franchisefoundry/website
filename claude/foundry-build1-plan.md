# The Foundry: Build 1 plan (v2)

Source of truth for the build. Design content comes from the canvas "The Foundry: Build 1"
(https://claude.ai/artifact/Wo3dm33C28MJ1pZfXwr5rX, 15 boards). Build, flow, data, integrations
and automations are decided here. UK English throughout.

v2 change: **The Foundry is a standalone marketplace on the website.** No account, no sign-in,
no portal. The portal stays for franchisees, franchisors, agents and admin. The two share one
database and nothing else.

---

## 0. Two products, one database

| | The Foundry (website) | Portal |
|---|---|---|
| Who | Anyone. Franchisees, would-be franchisees, franchisors, operators | Signed-in franchisees, franchisors, agents, admin |
| URL | `franchisefoundry.co.uk/foundry` | `portal.franchisefoundry.co.uk` |
| Code | Static HTML + vanilla JS in this repo root, Netlify functions in `netlify/functions/` | Next.js in `portal/` |
| Account | Never needed. Email verification on intro requests only | Required |
| Marketplace pages | Search, Results, Browse, Partner profile, Request intros, Intro tracker, Become a partner | None public. Admin runs everything (Partners, Applications, Intro requests, Search insights) |
| Data | Reads live partners, writes searches, intros, applications via Netlify functions (service key, server side) | Admin reads and writes everything |

```
  franchisefoundry.co.uk/foundry          portal.franchisefoundry.co.uk/admin
  ┌───────────────────────────┐           ┌──────────────────────────────┐
  │ Search · Results · Browse │           │ Partners · Applications      │
  │ Profile · Intro · Tracker │           │ Intro pipeline · Insights    │
  │ Become a partner          │           │                              │
  └─────────────┬─────────────┘           └──────────────┬───────────────┘
                │ Netlify functions                      │ Next route handlers
                └──────────────► Supabase ◄──────────────┘
                     (partners, intros, searches, applications)
```

Why the website and not the portal: the brief is a traditional online marketplace that stands on
its own. It also gets the SEO on the main domain (every partner profile is a real, indexable page
on franchisefoundry.co.uk), and a portal outage never takes the marketplace down.

How the website builds it, using what's already there:
- `build-articles.mjs` already turns content into static pages at deploy. Add
  `build-foundry.mjs`: pulls live partners from Supabase and writes `foundry/<slug>.html`
  profiles + the browse page. Saving a partner in portal admin fires a Netlify build hook, so
  changes are live in about a minute.
- Search, Results, the intro list and the tracker are static pages with a small vanilla JS module
  (`foundry/foundry.js`), calling Netlify functions. No framework, matches the rest of the site.
- `netlify/functions/` already sends email through Resend. Same pattern.

Brand: the website's green nav, Sora, gold `#c8924a`, plus IBM Plex Mono for scores and readouts
as per the canvas. Light theme throughout (the canvas Results board is dark; we build it light to
sit with the rest of the site).

---

## 1. Design board → where it's built

### Website (The Foundry)

| Board | Builds as | Notes |
|---|---|---|
| 01 Search | `foundry/index.html` | Live "Understood" readout, "People are asking", browse link, live stats strip |
| 02 Results | `foundry/search.html?q=` | Query chips, need tabs, deals-only, result cards, gap card, intro list sidebar |
| 03 Browse | `foundry/browse.html` (built at deploy) | Category tiles, filters, deals strip. Filtering client-side over the built JSON |
| 04 Partner profile | `foundry/<slug>.html` (built at deploy) | Our take, services, facts, FAQ, deal, sticky intro card. Indexable |
| 05 Request intros | Slide-over form on any page with the intro list | Per-partner need, plan chips, call time, name, email, phone (optional), consent |
| 05 Tracker | `foundry/track.html?t=<token>` | Live progress per partner. No login: the link in their email is the key |
| 06 Become a partner | `foundry/apply.html` | Multi-step form, uploads to Supabase storage |
| Nav | Every site page | "The Foundry" in main nav; homepage gets a search bar section |

The intro list (basket) lives in `localStorage`, so it persists across pages and visits.

### Portal (admin only for now)

| Board | Existing | Plan |
|---|---|---|
| A1 Applications | Nothing | **New** `/admin/foundry/applications`: 6-point checklist, Approve locked until 6/6, trust level, deal |
| A2 Partners + editor | `admin/partners/PartnersClient.tsx` (CRUD, order, active) | **Extend**: KPIs, trust level, reply time, conversion, live/paused, contacts, live preview. Save fires the website build hook |
| A3 Intro requests | `admin/intro-requests/page.tsx` (card grid, 3-value dropdown, **currently broken**, see below) | **Rebuild** on `KanbanBoard` + `crm/RecordDrawer`: SLA ages, briefing email, Brief / Chase / advance |
| A4 Search insights | Nothing | **New** `/admin/foundry/insights`: funnel, unanswered searches, demand vs supply |
| Nav | Single "Marketplace" item + `MarketplaceTabs` | **The Foundry** group: Partners, Applications, Intro requests, Search insights, Resales |

### Member portal boards (P1 Ask, P2 Picked for you, P4 My intros)

**Parked.** Signed-in franchisees just get a "The Foundry" sidebar link out to the website. Later,
if worth it: My intros inside the portal (requests are matched by email, so it's a read-only view),
and the portal's financing/marketplace placeholders point to the website. `MarketplaceView.tsx`
(built, unused) is retired or kept for that later step.

### Live bug found on the way

`portal/app/admin/intro-requests/page.tsx` selects `partners(name, sector)`. Migration 003 renamed
`sector` to `category`, so the query errors and the page always shows "No intro requests yet."
One-line fix; first commit of the build.

---

## 2. Data model

One migration, `portal/supabase/migrations/008_foundry_build1.sql`.

### 2.1 `partners` (extend)

```
trust_level      text check in ('listed','trusted','recommended') default 'listed'
status           text check in ('draft','live','paused')   -- replaces is_active (kept in sync for now)
our_take         text
services         jsonb default '[]'   -- [{title, description, price}]
faqs             jsonb default '[]'   -- [{q, a}]
regions          text[] default '{}'  -- 'uk' (UK-wide), 'nw', 'lon', 'scot' ...
base_location    text
price_from       text
budget_min_gbp   int, budget_max_gbp int
sectors          text[] default '{}'  -- coffee, qsr, fitness ... (experience)
keywords         text[] default '{}'  -- search synonyms, admin-editable
client_count     int
deal_value_gbp   int
deal_terms       text
```

### 2.2 `partner_contacts` (new, admin-only)

Who we brief: `partner_id, name, email, phone, role, is_primary`. Separate so nothing private can
ever reach the website build or a public function.

### 2.3 `foundry_contacts` (new): people who use the marketplace

No account. One row per email.
```
id, email (unique), name, phone null,
verified_at, marketing_opt_in boolean,
profile_id null → profiles   -- set if the email matches a portal user (admin can see the link)
lead_id null → leads         -- set when admin converts them into a franchise candidate
created_at
```

### 2.4 `intro_batches` (new): one submission, many partners

```
id, contact_id → foundry_contacts, search_id null,
context jsonb      -- plan chips at send: sector, area, budget, stage, brand
call_time text, consent_at timestamptz,
verify_token_hash text, verified_at timestamptz,
tracker_token_hash text      -- the no-login key for the tracker page
```

### 2.5 `intro_requests` (evolve existing)

```
batch_id      → intro_batches
requester_id  becomes nullable (portal-origin intros keep it; Foundry intros use the batch's contact)
need          text   -- per partner (existing `message` migrates here)
stage         text check in ('awaiting_verification','to_brief','briefed','in_contact','outcome','closed','withdrawn','expired')
briefed_at, contacted_at, outcome_at, closed_at, chased_at timestamptz
sla_due_at    timestamptz
brief_email   text
outcome       text check in ('hired','not_hired','undecided')
rating        text check in ('going_well','slow','not_fit')   -- private to us
```
Existing `status`: pending → to_brief, sent → briefed, completed → closed.

### 2.6 `intro_events` (new): the tracker timeline + audit

`intro_request_id, kind, actor_id null, body, visible_to_contact boolean, created_at`

### 2.7 `search_events`, `foundry_events` (new): feeds Insights

```
search_events:  id, session_id, raw_query, parsed jsonb, partner_ids uuid[], result_count,
                unmet_needs text[], parser ('rules'|'ai'), created_at
foundry_events: id, session_id, kind ('profile_view'|'add_to_list'|'gap_request'),
                partner_id null, search_id null, created_at
```
`session_id` is a first-party cookie. Cookie notice updated.

### 2.8 `partner_applications` (new)

Business fields, category, regions, client references, documents (storage paths), proposed deal,
`status` ('new','vetting','needs_info','approved','rejected'), `checks` jsonb (6 points with who/when/note),
trust level, `partner_id` on approval.

### 2.9 `partner_stats` (view)

Intros, conversion (hired / introduced), median reply (contacted minus briefed), rating mix.

### Access

- Website never talks to Supabase from the browser. All reads and writes go through Netlify
  functions with the service key, which only ever return public fields.
- Build step reads `status = 'live'` partners, public fields only.
- Admin in the portal: everything, via existing admin RLS.

---

## 3. API

### Website, Netlify functions (public, rate limited per IP + session)

| Function | Does |
|---|---|
| `foundry-parse` | Fast rules parse for the live "Understood" readout as they type |
| `foundry-search` | `{q, ctx}` → `{understood, summary, groups, alsoNeed, gaps, searchId}`. Logs the search |
| `foundry-event` | Beacons: profile view, add to list |
| `foundry-intro` | Creates contact (or reuses by email), batch, requests in `awaiting_verification`, sends the confirm email |
| `foundry-verify` | Confirm link target: marks verified, moves requests to `to_brief`, notifies admin, redirects to tracker |
| `foundry-track` | `?t=` → batch progress + visible events. Also "resend my tracker link" by email |
| `foundry-feedback` | Rating per intro from the tracker (or from the email buttons) |
| `foundry-withdraw` | Withdraw one partner or all |
| `foundry-gap` | "Ask us to source one" |
| `foundry-apply` | Partner application + signed upload URLs |

The search engine (`netlify/functions/lib/foundry-engine.mjs`: parse + rank) lives on the website
side. If the portal ever needs it, it calls the same function.

### Portal admin, Next route handlers

| Route | Does |
|---|---|
| `GET /api/admin/foundry/intros` | Board with SLA state |
| `POST /api/admin/foundry/intros/[id]/brief` | Send edited briefing email to partner contact, stage → briefed, event, email the contact |
| `POST /api/admin/foundry/intros/[id]/advance` | in_contact → outcome → closed, each emails the contact |
| `POST /api/admin/foundry/intros/[id]/chase` | Chase the partner |
| `POST /api/admin/foundry/contacts/[id]/convert` | Turn a marketplace contact into a lead (franchise candidate) |
| `/api/admin/partners` (+`[id]`) | Existing, extended. Save triggers the website build hook |
| `/api/admin/foundry/applications` (+ approve) | Vetting |
| `GET /api/admin/foundry/insights` | Funnel, gaps, demand vs supply |

### Automations (Netlify scheduled function)

- Brief SLA: 3h unbriefed → admin push; 4 working hours → overdue, red everywhere.
- Contact SLA: 24h after brief with no contact → chase drafted, admin push.
- Outcome nudge: 7 days in contact → email the contact "How did it go?" with one-click rating buttons.
- Unverified intros: reminder at 24h, expire at 7 days.

Working hours: Mon to Fri, 9 to 6 UK time, bank holidays excluded.

---

## 4. The flow

**Visitor:** search or browse → add partners to the intro list → one form (name, email, phone
optional, need per partner, consent) → "Check your email to confirm" → click confirm → tracker page.

**Why verify:** stops anyone sending someone else's details to partners. GDPR-clean consent
trail (`consent_at`, `verified_at`). Agreed.

**No account, ever, for the marketplace.** The confirm email and every update email carry the
tracker link. Lost it? "Email me my link" on the tracker page. Feels like a parcel tracker, not a login.

**Updates by email.** Each admin move (briefed, they've contacted you, how did it go?) emails the
contact with the tracker link. Ratings can be done straight from the email.

**Feeding the core business, without forcing it.**
- If the email belongs to a portal user, admin sees the link on the contact.
- The tracker and confirmation page carry a soft "Looking for the right franchise too? Get matched"
  card pointing at `/get-matched`.
- Admin can convert any marketplace contact to a lead in one click.
- Marketing opt-in is a separate, unticked box.

**Admin loop:** To brief → Briefed → In contact → Outcome → Closed, all in the portal. Unanswered
searches and "source one" requests → Insights → outreach → Applications → live partner →
website rebuilds.

**Ranking rule:** order is fit only. Deals, trust level and anything commercial never change order.

---

## 5. Build order

### Phase 1: marketplace core (website) + the admin can see it

1. Fix the admin intro-requests query bug (portal).
2. Migration 008. Backfill the 6 partners with regions, keywords, sectors.
3. `foundry-engine.mjs`: rules parser (needs, UK place → region, budget, sector, stage) + ranker + "also need" rules + summary sentence. Unit tested.
4. Functions: `foundry-parse`, `foundry-search`, `foundry-event`.
5. Pages: `foundry/index.html` (Search), `foundry/search.html` (Results), intro list, shared `foundry.js` + `foundry.css`.
6. Intro form + `foundry-intro`, `foundry-verify`, confirm email.
7. Tracker page + `foundry-track`, resend link.
8. Site nav + homepage search section.

### Phase 2: admin intro pipeline (portal)

1. Kanban with SLA ages, record drawer, editable briefing email, Brief / Chase / advance.
2. `partner_contacts` editing.
3. Update emails to the contact on every move + one-click rating.
4. Scheduled SLA function.
5. Contact → lead conversion.

Phases 1 and 2 together are the minimum to go live: people can find partners, request intros,
and we can work them.

### Phase 3: browse and profiles

`build-foundry.mjs`, browse page, partner profile pages, build hook from admin, partner admin
extensions (KPIs, trust, editor preview), sitemap.

### Phase 4: supply side and insights

Become a partner + applications vetting, Search insights, outreach list.

### Later

Portal member view of My intros, Plan my launch.

---

## 6. AI: where it earns its place

Principle: **AI reads and writes words; rules and data decide who's shown.** It never invents a
partner, price or deal, never changes ranking order, and if it fails or is slow the rules answer.

| # | Where | What it does | Model | When |
|---|---|---|---|---|
| 1 | Search submit | Messy English → structured query (needs, sector, area, budget, timing, stage) | Haiku (`claude-haiku-5-5`), structured output, ~1s timeout, rules fallback | Phase 1b |
| 2 | Results | Summary paragraph + why-it-fits ticks, written only from stored partner facts | Haiku | Phase 1b |
| 3 | Recall | Embeddings over partner profiles (pgvector) so wording we didn't anticipate still finds the right partner | Embeddings | Once partners > ~20 |
| 4 | Admin brief | Drafts the briefing email; admin edits and sends | Sonnet (`claude-sonnet-5-5`) | Phase 2 |
| 5 | Insights | Clusters unanswered searches into recruit themes | Sonnet, nightly | Phase 4 |
| 6 | Applications | Drafts profile, services and FAQ from the partner's site, like `import-article` does for blog posts | Sonnet | Phase 4 |
| 7 | Plan my launch | Parked per the canvas | n/a | Later |

To agree before switching on:
- Live readout stays rules-based; AI runs on submit.
- `search_events.parser` logs rules vs AI so we can prove it helps.
- Privacy notice paragraph on AI processing of search text.
- No financial or legal advice in prompts or output.
- `ANTHROPIC_API_KEY` already exists in the website's Netlify env (article importer), so the
  website functions can use it. Per-session cap on AI searches.

---

## 7. Decisions

Agreed:
- **Email verification before briefing.**
- **Marketplace is standalone on the website, no accounts.**

Defaults (shout if not):
1. Light theme for Results, matching the site.
2. Stats strip live from the DB, hidden until 10+ partners.
3. Marketplace contacts are not portal accounts; admin converts to lead when relevant.
4. Member portal boards (P1, P2, P4) parked; portal gets a link out to The Foundry.
5. Funding partners: quick FCA check (credit broking) with our adviser before lenders go live publicly. Not a build blocker.
