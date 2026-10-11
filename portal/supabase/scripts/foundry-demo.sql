-- ── The Foundry: demo data ────────────────────────────────────
-- Seeds the sample partners from the Build 1 canvas and marks them
-- is_demo, so they only appear while FOUNDRY_MODE=preview.
-- Safe to re-run. Run AFTER migration 008.
--
-- Demo personas (Sarah Ahmed, Tom Reid, Priya Shah, a franchisor, an agent)
-- and demo intros are added in phase 2 alongside My intros.
--
-- PURGE BEFORE LAUNCH (bottom of file).

update public.partners set
  is_demo = true, status = 'live', is_active = true, trust_level = 'recommended',
  regions = '{uk}', base_location = 'Manchester', price_from = 'from 4.9% APR',
  budget_min_gbp = 25000, budget_max_gbp = 500000,
  sectors = '{coffee,qsr,dessert,casual-dining}',
  keywords = '{loan,lender,lending,finance,borrow,"second site","equipment finance"}',
  client_count = 60, reply_hours_typical = 6, deal_value_gbp = 1500,
  deal_terms = 'Arrangement fee waived on your first loan when you request the intro through us.',
  our_take = 'Fast decisions and they actually understand franchise models. Our first call for first-unit funding on a recognised brand.',
  services = '[{"title":"First-unit franchise loan","description":"For signed franchisees. Up to 70% of costs.","price":"From 4.9% APR"},{"title":"Multi-site expansion","description":"For your second site onwards.","price":"Quote"},{"title":"Equipment finance","description":"Kit and fit-out spread over 3 to 5 years.","price":"From 6.5% APR"}]',
  faqs = '[{"q":"How much can I borrow?","a":"Usually up to 70% of the total opening cost for recognised brands, from £25k to £500k."},{"q":"Do I need security?","a":"Not always. Under £100k is often unsecured if the brand has a strong track record."},{"q":"How does the member deal work?","a":"Request the intro through us and the arrangement fee is waived on your first loan."}]'
where slug = 'capital-forge';

update public.partners set
  is_demo = true, status = 'live', is_active = true, trust_level = 'trusted',
  regions = '{uk}', base_location = 'Leeds', price_from = 'from £99/month',
  sectors = '{coffee,qsr,dessert,fitness}',
  keywords = '{accountant,forecast,bookkeeping,vat,payroll,xero}',
  client_count = 45, reply_hours_typical = 8, deal_value_gbp = 150,
  deal_terms = 'First 3 months at half price.',
  our_take = 'Accountants who only work with franchisees. They build the forecast lenders ask for, then run the books.',
  services = '[{"title":"Lender-ready forecast","description":"The 3-year forecast your lender will want.","price":"£350"},{"title":"Monthly accounts","description":"Books, VAT and payroll on Xero.","price":"From £99/month"}]'
where slug = 'northgate-counting';

update public.partners set
  is_demo = true, status = 'live', is_active = true, trust_level = 'recommended',
  regions = '{uk}', base_location = 'London', price_from = 'Review £450 fixed',
  keywords = '{solicitor,lawyer,agreement,"agreement review",lease,contract}',
  client_count = 40, reply_hours_typical = 4,
  our_take = 'Plain-English agreement reviews on a fixed fee. They tell you what you are actually signing.',
  services = '[{"title":"Franchise agreement review","description":"Written summary plus a call.","price":"£450 fixed"},{"title":"Lease review","description":"Commercial lease check before you sign.","price":"£350 fixed"}]'
where slug = 'hartley-bloom';

update public.partners set
  is_demo = true, status = 'live', is_active = true, trust_level = 'trusted',
  regions = '{uk}', base_location = 'Bristol', price_from = 'Same-day quotes',
  keywords = '{insurance,cover,liability,"public liability",contents}',
  client_count = 30, reply_hours_typical = 4, deal_value_gbp = 200,
  deal_terms = 'No broker fees.',
  our_take = 'Cover matched to what your franchisor requires, in place from handover day.'
where slug = 'cornerstone-cover';

update public.partners set
  is_demo = true, status = 'live', is_active = true, trust_level = 'trusted',
  regions = '{nw,ne,yh,em,wm,ee,lon,se,sw}', base_location = 'Birmingham', price_from = 'Quote per site',
  sectors = '{coffee,qsr,dessert}',
  keywords = '{shopfitter,shopfit,"fit-out",fitout,kiosk,refurb}',
  client_count = 25, reply_hours_typical = 12,
  our_take = 'Fit-out to brand spec in 2 to 6 weeks across England.'
where slug = 'sitefit-studio';

update public.partners set
  is_demo = true, status = 'paused', is_active = false, trust_level = 'listed',
  slug = 'all-gravy', tagline = 'Staff engagement & operations app',
  description = 'One app for frontline teams: onboarding, comms and checklists.',
  regions = '{uk}', price_from = 'Per site, monthly',
  keywords = '{app,onboarding,comms,checklists,"staff engagement"}',
  client_count = 20, reply_hours_typical = 24
where slug in ('a', 'all-gravy');

-- ── PURGE BEFORE LAUNCH ──────────────────────────────────────
-- delete from public.intro_batches  where is_demo;   -- cascades to intro_requests + intro_events
-- delete from public.search_events  where is_demo;
-- delete from public.foundry_events where is_demo;
-- delete from public.foundry_contacts where is_demo;
-- delete from public.partners       where is_demo;
