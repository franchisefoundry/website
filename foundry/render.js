/* The Foundry: partner profile and browse markup, shared by the browser
 * (partner.html renders on the fly) and the website build (build-foundry.mjs
 * writes real pages). Plain script: sets globalThis.FoundryRender. Every value
 * is escaped. No DOM access, so it runs in Node too. */
(function (root) {
  'use strict'

  var NEED = { funding: 'Funding', property: 'Property & fit-out', legal: 'Legal', accounting: 'Accounting', technology: 'Tech & EPOS', insurance: 'Insurance', marketing: 'Marketing', recruitment: 'Recruitment & HR' }
  var NEED_ORDER = ['funding', 'legal', 'accounting', 'insurance', 'property', 'technology', 'marketing', 'recruitment']
  var REGION = { nw: 'North West', ne: 'North East', yh: 'Yorkshire', em: 'East Midlands', wm: 'West Midlands', ee: 'East of England', lon: 'London', se: 'South East', sw: 'South West', wal: 'Wales', scot: 'Scotland', ni: 'Northern Ireland' }
  var TRUST = { recommended: 'Recommended', trusted: 'Trusted', listed: 'Listed' }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
  function k(n) { return n >= 1e6 ? '£' + (n / 1e6) + 'm' : '£' + Math.round(n / 1000) + 'k' }
  function trust(level) { var l = TRUST[level] ? level : 'listed'; return '<span class="trust ' + l + '">' + TRUST[l] + '</span>' }
  function catLabel(c) { return NEED[c] || c || 'Partner' }
  function cover(regions) {
    regions = regions || []
    if (regions.indexOf('uk') >= 0) return 'UK-wide'
    return regions.map(function (x) { return REGION[x] || x }).join(', ') || 'Ask them'
  }
  function href(slug) { return '/foundry/partners/' + encodeURIComponent(slug) + '/' }

  /** The profile body (everything inside <main>). Buttons get ids #req and #add. */
  function profile(p, opts) {
    opts = opts || {}
    var cat = catLabel(p.category)
    var facts = (p.features || []).map(function (f) { return [f.label, f.value] })
    if (p.budget_min_gbp && p.budget_max_gbp && !facts.length) facts.push(['Range', k(p.budget_min_gbp) + '–' + k(p.budget_max_gbp)])
    if (p.reply_hours) facts.push(['Usually replies', '~' + p.reply_hours + ' hours'])
    if (p.client_count) facts.push(['Franchise clients', p.client_count + '+'])
    facts.push(['Covers', cover(p.regions)])
    var inList = !!opts.inList
    return '<p style="margin-top:20px;font-size:13px;color:var(--ink-3)"><a href="/foundry/">The Foundry</a> / <a href="/foundry/partners/#' + esc(p.category) + '">' + esc(cat) + '</a></p>' +
      '<div class="profile"><div style="display:grid;gap:20px;min-width:0">' +
        '<header class="panel"><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">' +
          (/^https:\/\//.test(p.logo_url || '') ? '<img src="' + esc(p.logo_url) + '" alt="" width="48" height="48" style="width:48px;height:48px;border-radius:12px;object-fit:contain;background:#fff;border:1px solid var(--line)">'
            : '<span class="mono-badge" style="width:48px;height:48px;font-size:20px;border-radius:12px" aria-hidden="true">' + esc(String(p.name || '?').charAt(0)) + '</span>') +
          '<div><h1 style="font-size:clamp(28px,4vw,40px);font-weight:800;letter-spacing:-0.03em">' + esc(p.name) + '<span class="accent">.</span></h1><p style="color:var(--ink-2)">' + esc(p.tagline || '') + '</p></div></div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;font-size:13px">' + trust(p.trust_level) + '<span class="trust listed">' + esc(cat) + '</span>' + (p.base_location ? '<span class="trust listed">Based in ' + esc(p.base_location) + '</span>' : '') + '</div>' +
          '<dl class="facts-grid">' + facts.slice(0, 5).map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>' }).join('') + '</dl></header>' +
        (p.our_take ? '<section class="take"><h2>OUR TAKE</h2><p>' + esc(p.our_take) + '</p><p style="font-size:12px;color:rgba(255,255,255,.75);margin-top:10px">Vetted by Franchise Foundry: company checks, insurance and franchise client references.</p></section>' : '') +
        ((p.services || []).length || p.description ? '<section class="panel"><h2 style="font-size:18px">What they do</h2>' + (p.description ? '<p style="color:var(--ink-2);margin-top:6px;white-space:pre-line">' + esc(p.description) + '</p>' : '') +
          '<ul class="svc">' + (p.services || []).map(function (s) { return '<li><span><b>' + esc(s.title) + '</b>' + (s.description ? '<br><span style="color:var(--ink-2);font-size:14px">' + esc(s.description) + '</span>' : '') + '</span>' + (s.price ? '<span class="mono">' + esc(s.price) + '</span>' : '') + '</li>' }).join('') + '</ul></section>' : '') +
        ((p.faqs || []).length ? '<section class="panel"><h2 style="font-size:18px">Questions people ask</h2>' + p.faqs.map(function (f, i) { return '<details class="faq"' + (i === 0 ? ' open' : '') + '><summary>' + esc(f.q) + '</summary><p style="color:var(--ink-2)">' + esc(f.a) + '</p></details>' }).join('') + '</section>' : '') +
      '</div><aside><div class="panel">' +
        (p.offer_text ? '<div class="mono" style="font-size:11px;letter-spacing:.1em;color:var(--gold-ink)">MEMBER DEAL</div><div class="deal" style="margin-top:8px">' + esc(p.offer_text) + '</div>' + (p.deal_terms ? '<p style="font-size:12px;color:var(--ink-3);margin-top:8px">' + esc(p.deal_terms) + '</p>' : '') : '') +
        '<button type="button" class="btn btn-gold btn-block" id="req" style="margin-top:16px;min-height:52px">Request intro →</button>' +
        '<button type="button" class="btn btn-outline btn-block" id="add" style="margin-top:8px" aria-pressed="' + inList + '">' + (inList ? '✓ In your intro list' : '+ Add to intro list') + '</button>' +
        '<p style="font-size:12px;color:var(--ink-2);margin-top:14px;padding-top:12px;border-top:1px solid var(--line)">We brief them on what you need first' + (p.reply_hours ? ', and they usually reply within ' + esc(p.reply_hours) + ' hours' : '') + '. Free for you.</p>' +
      '</div></aside></div>'
  }

  /** The browse list: every live partner, grouped by what they help with. */
  function browse(partners) {
    var groups = NEED_ORDER.map(function (n) { return { need: n, items: partners.filter(function (p) { return p.category === n }) } })
      .filter(function (g) { return g.items.length })
    if (!groups.length) return '<div class="soon"><h1>Partners coming soon<span class="accent">.</span></h1><p>We’re vetting the first partners now.</p><p style="margin-top:20px"><a class="btn btn-green" href="/foundry/">Foundry Search</a></p></div>'
    return '<section style="padding:32px 0 8px"><span class="eyebrow"><i aria-hidden="true"></i>VETTED PARTNERS</span>' +
      '<h1 class="h-big" style="font-size:clamp(32px,5vw,52px);line-height:1.05;margin-top:14px">Every Foundry partner<span class="accent">.</span></h1>' +
      '<p style="color:var(--ink-2);margin-top:8px;max-width:60ch">Funding, legal, accounting, property and more. Each one vetted by us: company checks, insurance and franchise client references. Free for franchisees, with member deals on top.</p>' +
      '<nav class="chips-row" aria-label="Jump to">' + groups.map(function (g) { return '<a class="chip" style="text-decoration:none" href="#' + g.need + '">' + esc(NEED[g.need]) + ' <span class="mono" style="margin-left:6px;color:var(--ink-3)">' + g.items.length + '</span></a>' }).join('') + '</nav></section>' +
      groups.map(function (g) {
        return '<section id="' + g.need + '" style="padding-top:24px;scroll-margin-top:16px"><div class="group-h"><h2 style="font-size:20px">' + esc(NEED[g.need]) + '</h2><span class="note">' + g.items.length + ' partner' + (g.items.length === 1 ? '' : 's') + '</span></div>' +
          '<div class="browse-grid">' + g.items.map(function (p) {
            return '<a class="panel browse-card" href="' + href(p.slug) + '">' +
              '<span style="display:flex;gap:10px;align-items:center"><span class="mono-badge" aria-hidden="true">' + esc(String(p.name).charAt(0)) + '</span><b>' + esc(p.name) + '</b></span>' +
              '<span style="color:var(--ink-2);font-size:14px">' + esc(p.tagline || '') + '</span>' +
              '<span style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">' + trust(p.trust_level) + '<span class="cat">' + esc(cover(p.regions)) + '</span></span>' +
              (p.offer_text ? '<span class="deal">' + esc(p.offer_text) + '</span>' : '') +
            '</a>'
          }).join('') + '</div></section>'
      }).join('')
  }

  root.FoundryRender = { esc: esc, profile: profile, browse: browse, catLabel: catLabel, cover: cover, href: href }
})(typeof globalThis !== 'undefined' ? globalThis : this)
