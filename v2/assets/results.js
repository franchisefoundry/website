// Franchise Foundry v2: match results, three quick questions, book the call.
// Ported from the Results v3 board. The shortlist is example data until the
// matching service is wired in; the brief chips come from the answers saved on /v2/match/.
(function () {
  'use strict'
  var $ = function (id) { return document.getElementById(id) }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }

  var M = [
    { code: 'A', sector: 'Quick service', s: 93, inv: '£110–150k', terr: 'Manchester open', line: 'Built for a manager from year two. Closes by 9pm.',
      f: [97, 100, 100, 100, 100], why: [['Middle of your budget, room for working capital', 'BRAND FEES · 2026'], ['Manager-run from year two is the norm', 'FRANCHISEE CALLS'], ['Three owners already run 2+ sites', 'BRAND DATA']],
      watch: 'Royalty plus marketing levy is on the high side. Ask how that lands at your expected turnover.' },
    { code: 'G', sector: 'Bakery', s: 92, inv: '£120–150k', terr: 'Open', line: 'Daytime only. Clear path to a second site.',
      f: [90, 100, 100, 100, 100], why: [['Daytime trade, no late nights', 'BRAND DATA'], ['Your kitchen background is a real edge here', 'YOUR STORY'], ['Second-site support built into the agreement', 'AGREEMENT SUMMARY']],
      watch: 'Early starts. Ask what year one really looks like before you can step back.' },
    { code: 'B', sector: 'Coffee & drinks', s: 89, inv: '£90–130k', terr: '2 areas open', line: 'Lowest spend, so the most left in reserve.',
      f: [100, 100, 100, 75, 100], why: [['Leaves the most in reserve', 'BRAND FEES · 2026'], ['Simple menu, small team', 'BRAND DATA'], ['Strong weekday trade near offices', 'SITE P&LS']],
      watch: 'Less food-led than you asked for. Margins hinge on rent, so ask for P&Ls from sites like yours.' }
  ]
  var FL = ['Budget', 'Area', 'How you’ll run it', 'Sector', 'Growth plan']
  var A = [
    { q: 'Which one gets me to a second site fastest?', a: 'Brand A, going by what its current owners have done so far. Harry will take you through the real timelines, and what slowed people down, on your call.', src: ['BRAND DATA', 'FRANCHISEE CALLS'] },
    { q: 'What would my week look like in year one?', a: 'With A or B, expect five days in the unit while you train a manager. G starts earlier: most owners are in by 6am for the bake. All three close by 9pm.', src: ['BRAND OPS MANUALS'] },
    { q: 'How much would I need from my own savings?', a: 'We can’t say for certain without your lender’s view. As a rough guide, banks usually want a share of the total from you. The Foundry lender pre-check gives you a real figure in a few minutes.', src: ['FOUNDRY LENDERS'] },
    { q: 'Which brands are they?', a: 'Names come on your call, once we’ve checked the fit with you. It means you judge the numbers before the logo. I’ve saved this for Harry.', src: ['HOW WE WORK'] }
  ]
  var S = [['Tue 27 Oct', '11:00'], ['Tue 27 Oct', '15:30'], ['Wed 28 Oct', '09:30'], ['Thu 29 Oct', '17:30']]
  var MAX = 3
  var st = { sel: 0, ask: 0, asked: [0], custom: [], slot: 0, booked: false }

  // Brief chips from the matching page, if the visitor came through it
  function briefChips() {
    var saved; try { saved = JSON.parse(sessionStorage.getItem('ffv2-match')) } catch (e) {}
    if (!saved || !saved.ans) return
    var a = saved.ans, out = []
    var BUD = ['Under £50k', '£50k–£100k', '£100k–£150k', '£150k–£250k', '£250k+']
    var AREAS = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Elsewhere']
    if (a.b !== undefined) out.push(BUD[a.b])
    if (a.a !== undefined) out.push(AREAS[a.a])
    if (a.m !== undefined) out.push(['Hands-on', 'Hands-on, then manager', 'Manager-run'][a.m])
    if (a.g !== undefined) out.push(['1 site', '2–3 sites', 'A group'][a.g])
    if (out.length) $('brief-chips').innerHTML = out.map(function (t) { return '<span class="brief-chip">' + esc(t) + '</span>' }).join('')
  }

  function used() { return st.asked.length + st.custom.length }

  function render() {
    $('cards').innerHTML = M.map(function (m, i) {
      var on = st.sel === i
      return '<button type="button" class="radio-card" role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-sel="' + i + '">' +
        '<span class="between" style="align-items:center;align-self:stretch;flex-wrap:nowrap"><span class="row mono label" style="gap:8px;font-size:11px;flex-wrap:nowrap"><span class="lockbox"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>0' + (i + 1) + ' · BRAND ' + m.code + '</span>' +
        '<span class="mono" style="font-size:24px;font-weight:600;color:' + (i === 0 ? '#8A5F26' : '#3A4A3A') + '">' + m.s + '</span></span>' +
        '<span style="font-size:18px;font-weight:700;letter-spacing:-.02em">' + esc(m.sector) + '</span>' +
        '<span class="small muted">' + esc(m.line) + '</span>' +
        '<span class="row" style="gap:4px"><span class="tag">' + esc(m.inv) + '</span><span class="tag">' + esc(m.terr) + '</span></span></button>'
    }).join('')
    var s = M[st.sel]
    $('sel-k').textContent = 'MATCH 0' + (st.sel + 1) + ' · BRAND ' + s.code + ' · NAME ON YOUR CALL'
    $('sel-sector').textContent = s.sector
    $('sel-s').textContent = s.s
    $('factors').innerHTML = s.f.map(function (v, i) {
      var c = v >= 85 ? '#3A4A3A' : v >= 70 ? '#8FA38F' : '#C8924A'
      return '<div class="factor"><span>' + FL[i] + '</span><span class="bar"><span style="width:' + v + '%;height:6px;background:' + c + '"></span></span><span class="mono" style="font-size:12px;text-align:right">' + v + '</span></div>'
    }).join('')
    $('why').innerHTML = s.why.map(function (w) { return '<div class="between" style="gap:12px;padding:7px 0;border-top:1px solid var(--grid);font-size:13px;flex-wrap:nowrap;align-items:baseline"><span>' + esc(w[0]) + '</span><span class="mono label" style="flex:0 0 auto;font-size:10px">' + esc(w[1]) + '</span></div>' }).join('')
    $('watch').textContent = s.watch

    var out = used() >= MAX
    $('asks').innerHTML = A.map(function (x, i) {
      var on = st.ask === i, locked = st.asked.indexOf(i) < 0 && out
      return '<button type="button" class="pill ask" data-ask="' + i + '" aria-pressed="' + on + '"' + (locked ? ' disabled' : '') + '>' + esc(x.q) + '</button>'
    }).join('')
    var a = typeof st.ask === 'number' ? A[st.ask] : st.ask
    $('answer').innerHTML = a ? '<div style="align-self:flex-end;max-width:80%;padding:10px 14px;border-radius:14px 14px 4px 14px;background:var(--green);color:#fff;font-size:14px">' + esc(a.q) + '</div>' +
      '<div class="stack" style="max-width:88%;--gap:10px;padding:14px 16px;border-radius:14px 14px 14px 4px;background:#fff;border:1px solid var(--line);font-size:14px"><span>' + esc(a.a) + '</span>' +
      '<span class="row" style="gap:6px">' + a.src.map(function (x) { return '<span class="tag" style="color:var(--green)">' + esc(x) + '</span>' }).join('') + '</span>' +
      '<span class="xs" style="color:var(--gold-ink)">◆ Added to Harry’s notes for your call.</span></div>' : ''
    $('ask-left').textContent = Math.max(0, MAX - used())
    $('ask-box').hidden = out
    $('asked-out').hidden = !out
    $('q-count').textContent = used()

    $('slots').innerHTML = S.map(function (x, i) { return '<button type="button" class="slot" data-slot="' + i + '" aria-pressed="' + (st.slot === i) + '"><span>' + x[0] + '</span><span class="mono">' + x[1] + '</span></button>' }).join('')
    var bb = $('book-btn')
    bb.textContent = st.booked ? '✓ Booked · ' + S[st.slot][0] + ', ' + S[st.slot][1] : 'Book ' + S[st.slot][0] + ', ' + S[st.slot][1]
    bb.className = 'btn btn-lg ' + (st.booked ? 'btn-tint' : 'btn-primary')
    bb.style.color = st.booked ? 'var(--ink)' : ''
  }

  document.addEventListener('DOMContentLoaded', function () {
    briefChips()
    render()
    $('cards').addEventListener('click', function (e) { var b = e.target.closest('[data-sel]'); if (b) { st.sel = Number(b.getAttribute('data-sel')); render(); $('cards').children[st.sel].focus() } })
    $('cards').addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
      if (!d) return
      e.preventDefault(); st.sel = (st.sel + d + M.length) % M.length; render(); $('cards').children[st.sel].focus()
    })
    $('asks').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ask]'); if (!b || b.disabled) return
      var i = Number(b.getAttribute('data-ask'))
      if (st.asked.indexOf(i) < 0) st.asked.push(i)
      st.ask = i; render()
    })
    $('ask-form').addEventListener('submit', function (e) {
      e.preventDefault()
      var q = $('ask-input').value.trim(); if ($('ask-input').disabled || !q || used() >= MAX) return
      st.custom.push(q)
      st.ask = { q: q, a: 'Good one. That needs the detail we go through on your call, so I’ve passed it straight to Harry rather than guess.', src: ['SAVED FOR YOUR CALL'] }
      $('ask-input').value = ''; render()
    })
    $('lower-btn').addEventListener('click', function () {
      var open = $('lower').hidden
      $('lower').hidden = !open
      this.setAttribute('aria-expanded', String(open))
      this.textContent = open ? 'Hide them ↑' : 'Show them ↓'
    })
    $('slots').addEventListener('click', function (e) { var b = e.target.closest('[data-slot]'); if (b) { st.slot = Number(b.getAttribute('data-slot')); st.booked = false; render() } })
    $('book-btn').addEventListener('click', function () { st.booked = true; render() })
  })
})()
