// Franchise Foundry v2: matching (questions route plus the capped assistant).
// Ported from the Matching v3 board. Scoring runs in the browser against seven
// anonymous brand profiles; weights are placeholders until Harry confirms them.
// The assistant is a rules-based stand-in for the server-side LLM (phase 2):
// it only fills the six brief fields and parks brand, fee and "which is best"
// questions for the call. Answers are kept in sessionStorage for the results page.
(function () {
  'use strict'
  var $ = function (id) { return document.getElementById(id) }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  var STORE = 'ffv2-match'

  var KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  var BUD = [['Under £50k', 0, 50], ['£50k–£100k', 50, 100], ['£100k–£150k', 100, 150], ['£150k–£250k', 150, 250], ['£250k+', 250, 9999]]
  var FOODK = ['coffee', 'bakery', 'qsr', 'asian', 'healthy', 'dessert', 'any']
  var FOODN = ['Coffee & drinks', 'Bakery', 'Quick service', 'Asian', 'Healthy & bowls', 'Desserts', 'Open to anything']
  var AREAS = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol', 'Somewhere else']
  var RULES = ['late', 'weekend', 'big']
  var onKeys = function (v) { return Object.keys(v || {}).filter(function (k) { return v[k] }) }
  var Q = [
    { id: 'b', title: 'What could you invest?', hint: 'Roughly is fine. Include what you’d borrow.', min: '160px', opts: BUD.map(function (x) { return [x[0]] }), short: function (v) { return BUD[v][0] }, ask: 'What could you invest, roughly?' },
    { id: 'a', title: 'Where would you open?', hint: 'We only show brands with territory free near you.', min: '150px', opts: AREAS.map(function (x) { return [x] }), short: function (v) { return v === 5 ? 'Elsewhere' : AREAS[v] }, ask: 'Where would you like to open?' },
    { id: 'm', title: 'How hands-on do you want to be?', hint: 'This changes which brands fit more than anything else.', min: '100%', opts: [['Hands-on', 'I’ll be in most days'], ['Hands-on, then a manager', 'Run it for a year, then step back'], ['Manager from day one', 'I’ll oversee, not run it']], short: function (v) { return ['Hands-on', 'Then a manager', 'Manager-run'][v] }, ask: 'How hands-on do you want to be?' },
    { id: 'f', multi: true, title: 'What would you love to run?', hint: 'Pick as many as you like.', min: '160px', opts: FOODN.map(function (x) { return [x] }), short: function (v) { var ks = onKeys(v); if (!ks.length) return null; return ks.length === 1 ? FOODN[FOODK.indexOf(ks[0])] : ks.length + ' food types' }, ask: 'What food would you love to run? Tell me, or tap it on the left.' },
    { id: 'g', title: 'Where do you want to be in three years?', hint: 'Some brands are built for one great site, others for groups.', min: '100%', opts: [['One great site'], ['2–3 sites'], ['A multi-site group']], short: function (v) { return ['1 site', '2–3 sites', 'A group'][v] }, ask: 'Where do you want to be in three years: one site, a few, or a group?' },
    { id: 'k', title: 'What’s your background?', hint: 'No wrong answer. It shapes what we ask brands for you.', min: '100%', opts: [['Hospitality', 'Kitchens, bars, restaurants'], ['Management or retail', 'Running teams and numbers'], ['New to all this', 'Career change, fresh start']], short: function (v) { return ['Hospitality', 'Management', 'New to it'][v] }, ask: 'And your background: hospitality, management, or new to all this?' },
    { id: 'start', title: 'When do you want to open?', hint: 'Territory moves fast.', min: '100%', opts: [['As soon as possible'], ['In about 6 months'], ['12 months or more']], short: function (v) { return ['ASAP', '6 months', '12 months+'][v] } },
    { id: 'rules', multi: true, title: 'Anything you’d rule out?', hint: 'We’ll drop any brand that needs these.', min: '100%', opts: [['Trading past 10pm'], ['Regular weekend shifts'], ['Teams of 15 or more']], short: function (v) { var n = onKeys(v).length; return n ? n + ' ruled out' : 'Nothing ruled out' } },
    { id: 'funds', title: 'How much of that is ready now?', hint: 'This shapes which finance partners we line up.', min: '100%', opts: [['All of it'], ['Around a third'], ['Not sure yet']], short: function (v) { return ['Funds ready', 'A third ready', 'Funds TBC'][v] } }
  ]
  var BRIEF = ['b', 'a', 'm', 'f', 'g', 'k']
  var N = Q.length
  var MAX = 6
  var QUESTION = /\?|which brand|best brand|recommend|royalt|fees?\b|profit|earn|margin|turnover|what brands|who are|names?\b|cost of/i
  var BRANDS = [
    { code: 'A', key: 'qsr', mgr: true, late: false, multi: true, cost: 130 },
    { code: 'B', key: 'coffee', mgr: true, late: false, multi: true, cost: 110 },
    { code: 'C', key: 'asian', mgr: true, late: true, multi: true, cost: 210 },
    { code: 'D', key: 'coffee', mgr: false, late: false, multi: false, cost: 70 },
    { code: 'E', key: 'dessert', mgr: true, late: true, multi: false, cost: 100 },
    { code: 'F', key: 'qsr', mgr: false, late: true, multi: true, cost: 160 },
    { code: 'G', key: 'bakery', mgr: true, late: false, multi: true, cost: 135 }
  ]
  var STARTERS = [
    ['Try: ex-pub chef, £120k, Manchester', 'I’ve got about £120k, live near Manchester and ran a pub kitchen for six years. Hands-on first year, then a manager. Food-led, not desserts.'],
    ['Try: career changer in Leeds', 'Teacher in Leeds, about £80k saved, new to all this. Coffee or a bakery, one site.'],
    ['Try: investor, £250k, 2+ sites', 'Around £250k for Birmingham. Manager from day one, a couple of sites. Quick service or Asian.'],
    ['Ask: which brand makes the most money?', 'Which brand makes the most money?']
  ]
  var HELLO = { r: 'ai', t: 'Hi, I’m the Franchise Foundry assistant. Tell me your budget, where you’d open, how hands-on you want to be and what you’d love to run. A sentence or two is plenty.' }

  var st = { q: 0, ans: {}, src: {}, last: null, notes: [], msgs: [HELLO] }
  try { var saved = JSON.parse(sessionStorage.getItem(STORE)); if (saved && saved.ans) st = saved } catch (e) {}

  // Prefill from the home and sector forms: ?budget=&area=&start=&sector=
  ;(function prefill() {
    var p = new URLSearchParams(location.search)
    if (![].concat('budget', 'area', 'start', 'sector').some(function (k) { return p.has(k) })) return
    var b = Number(p.get('budget')); if (p.get('budget') !== null && b >= 0 && b < BUD.length) st.ans.b = b
    var area = (p.get('area') || '').trim().toLowerCase()
    if (area) { var ai = AREAS.slice(0, 5).map(function (x) { return x.toLowerCase() }).indexOf(area); st.ans.a = ai < 0 ? 5 : ai }
    var s = Number(p.get('start')); if (p.get('start') !== null && s >= 0 && s < 3) st.ans.start = s
    var sec = p.get('sector'); if (sec && FOODK.indexOf(sec) >= 0) { st.ans.f = {}; st.ans.f[sec] = true }
    Object.keys(st.ans).forEach(function (k) { st.src[k] = 'tap' })
    st.q = firstOpen(st.ans)
    history.replaceState(null, '', location.pathname)
  })()

  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(st)) } catch (e) {} }
  function set(patch) { Object.keys(patch).forEach(function (k) { st[k] = patch[k] }); save(); render() }
  function firstOpen(ans) { var i = Q.findIndex(function (q) { return ans[q.id] === undefined }); return i < 0 ? N : i }
  function missingBrief(ans) { return BRIEF.filter(function (k) { return ans[k] === undefined }) }
  function qOf(id) { return Q.filter(function (q) { return q.id === id })[0] }
  function usedOf(msgs) { return msgs.filter(function (m) { return m.r === 'me' }).length }
  function copy(o) { return JSON.parse(JSON.stringify(o)) }

  function detect(S) {
    var L = S.toLowerCase(), t = {}
    var bm = S.match(/£\s?(\d{2,3})\s?k/i); if (bm) { var v = Number(bm[1]); t.b = v >= 250 ? 4 : v >= 150 ? 3 : v >= 100 ? 2 : v >= 50 ? 1 : 0 }
    ;['london', 'manchester', 'birmingham', 'leeds', 'bristol'].forEach(function (c, i) { if (t.a === undefined && L.indexOf(c) >= 0) t.a = i })
    if (t.a === undefined && /glasgow|liverpool|edinburgh|sheffield|newcastle|cardiff|nottingham|somewhere else|elsewhere/.test(L)) t.a = 5
    var mgr = /manager/.test(L), hands = /hands-on|hands on|first year|year one|myself/.test(L)
    if (mgr && hands) t.m = 1; else if (mgr) t.m = 2; else if (hands) t.m = 0
    if (/group/.test(L)) t.g = 2; else if (/second|third|couple of sites|sites|2-3|2–3|a few/.test(L)) t.g = 1; else if (/one site|1 site|single site/.test(L)) t.g = 0
    if (/no hospitality|career change|never worked in|new to all/.test(L)) t.k = 2; else if (/kitchen|pub|restaurant|hospitality|chef/.test(L)) t.k = 0; else if (/retail|managed|director|management/.test(L)) t.k = 1
    var tf = {}
    ;[['coffee', 0], ['bakery', 1], ['quick service', 2], ['burger', 2], ['chicken', 2], ['asian', 3], ['sushi', 3], ['healthy', 4], ['bowls', 4], ['dessert', 5]].forEach(function (x) { if (L.indexOf(x[0]) >= 0) tf[FOODK[x[1]]] = true })
    if (/food-led/.test(L)) { tf.qsr = true; tf.asian = true; tf.bakery = true; tf.healthy = true }
    if (/not (really )?desserts?/.test(L)) delete tf.dessert
    if (/open to anything|anything/.test(L)) tf = { any: true }
    if (Object.keys(tf).length) t.f = tf
    return t
  }

  function aiReply(ans, newly) {
    var labs = newly.map(function (k) { return qOf(k).short(ans[k]) }).filter(Boolean)
    var miss = missingBrief(ans)
    var text = labs.length ? 'Got it. I’ve filled in ' + labs.length + (labs.length === 1 ? ' answer' : ' answers') + ' for you.' : 'Thanks. I couldn’t pin down the details from that.'
    text += miss.length ? ' ' + qOf(miss[0]).ask : ' That’s your brief done. The best next step is a 20-minute call with Harry: you get the names, the real numbers and answers to anything you’ve saved.'
    return { r: 'ai', t: text, chips: labs, qr: miss.length && !qOf(miss[0]).multi ? miss[0] : null }
  }

  function sendText(text) {
    if (!text || !text.trim() || usedOf(st.msgs) >= MAX) return
    var t = detect(text), n = copy(st.ans), src = copy(st.src), newly = []
    BRIEF.forEach(function (k) { if (t[k] !== undefined) { n[k] = t[k]; src[k] = 'ai'; newly.push(k) } })
    var notes = st.notes.slice(), reply
    if (QUESTION.test(text)) {
      notes.push(text.length > 70 ? text.slice(0, 68) + '…' : text)
      var base = aiReply(n, newly), miss = missingBrief(n)
      reply = { r: 'ai', t: 'Good question, and one for your call. Brand names and numbers depend on details we check with you first, so I don’t give them out here. I’ve saved it for Harry.' + (newly.length ? ' I’ve also filled in ' + newly.length + ' answer' + (newly.length > 1 ? 's' : '') + '.' : '') + (miss.length ? ' ' + qOf(miss[0]).ask : ''), chips: base.chips, qr: base.qr }
    } else reply = aiReply(n, newly)
    var msgs = st.msgs.concat([{ r: 'me', t: text }, reply])
    if (usedOf(msgs) >= MAX && missingBrief(n).length) msgs.push({ r: 'ai', t: 'That’s enough for me to work with. Tap the last few on the left if you like, or bring them to your call.' })
    $('ai-input').value = ''
    set({ ans: n, src: src, msgs: msgs, notes: notes, q: firstOpen(n), last: newly.length ? 'ai' : st.last })
  }

  function setAns(id, val, advance) {
    var n = copy(st.ans), src = copy(st.src)
    if (val === null) delete n[id]; else n[id] = val
    src[id] = 'tap'
    set({ ans: n, src: src, last: id, q: advance ? firstOpen(n) : st.q })
  }

  function scores() {
    var A = st.ans
    var b = A.b !== undefined ? A.b : -1, a = A.a !== undefined ? A.a : -1, m = A.m !== undefined ? A.m : -1, g = A.g !== undefined ? A.g : -1
    var f = A.f || null, fKeys = onKeys(f), rules = A.rules || {}
    return BRANDS.map(function (br) {
      var vals = [
        b < 0 ? null : br.cost > BUD[b][2] * 1.1 ? 0.4 : br.cost < BUD[b][1] ? 0.9 : 1,
        a < 0 ? null : (br.code === 'D' ? 0.7 : 1),
        m < 0 ? null : m === 0 ? (br.mgr ? 0.85 : 1) : m === 1 ? (br.mgr ? 1 : 0.45) : (br.mgr ? 1 : 0.3),
        !fKeys.length ? null : f.any ? 1 : f[br.key] ? 1 : 0.6,
        g < 0 ? null : g === 0 ? (br.multi ? 0.9 : 1) : (br.multi ? 1 : 0.4)
      ]
      if (!vals.some(function (x) { return x !== null })) return { code: br.code, s: null }
      var s = vals.reduce(function (acc, x) { return acc + (x === null ? 0.72 : x) }, 0) / 5 * 100 - 7
      if (rules.late && br.late) s -= 30
      if (rules.weekend) s -= 3
      return { code: br.code, s: Math.round(Math.max(20, Math.min(97, s))) }
    })
  }

  function latest() {
    var A = st.ans, b = A.b !== undefined ? A.b : -1, m = A.m !== undefined ? A.m : -1, g = A.g !== undefined ? A.g : -1
    var f = A.f, rules = A.rules || {}
    var L = {
      b: b >= 0 && b < 3 ? 'C dropped: typical spend is over your budget.' : 'Budget set. Every brand is in range.',
      a: 'Territory checked. D has limited space near you.',
      m: m >= 1 ? 'D and F dropped: both need the owner on the floor.' : 'Hands-on suits all seven. Owner-run brands move up.',
      f: onKeys(f).length ? (f.any ? 'Open to anything: nothing filtered out.' : 'Food filter on: brands outside your picks move down.') : 'Food filter cleared.',
      g: g >= 1 ? 'D and E dropped: single-site models.' : 'One site: every model works for you.',
      k: 'Noted. We’ll brief brands on your background.',
      start: 'Timeline noted. Territory still open for the top three.',
      rules: rules.late ? 'C, E and F ruled out: late trading is core to them.' : 'Noted. Nothing major changed.',
      funds: A.funds === 0 ? 'Funds ready: strong position for intros.' : 'We’ll line up Foundry lenders before your call.',
      ai: 'The assistant filled in your answers. All seven brands re-scored.'
    }
    return st.last ? L[st.last] : 'Every answer re-scores all seven brands, live.'
  }

  function render() {
    var A = st.ans, qi = st.q, done = qi >= N, cur = done ? null : Q[qi]
    var answeredN = Q.filter(function (q) { return A[q.id] !== undefined }).length
    var briefCount = BRIEF.filter(function (k) { return A[k] !== undefined }).length
    var canGo = briefCount >= 2

    $('stage').textContent = done ? 'READY · YOUR SHORTLIST' : (qi < 6 ? 'YOUR BRIEF · ' + (qi + 1) + ' OF 6' : 'LAST BITS · ' + (qi - 5) + ' OF 3')
    $('progress').style.width = Math.round(answeredN / N * 85) + '%'

    // Live match strip
    var sc = scores(), any = sc[0].s !== null
    $('live-dot').style.background = any ? '#C8924A' : '#8E988F'
    $('fit-count').textContent = any ? sc.filter(function (x) { return x.s >= 75 }).length : 7
    $('fit-label').textContent = any ? 'of 7 brands fit so far · ' + sc.filter(function (x) { return x.s >= 85 }).length + ' strong' : 'brands to match against. Answer anything to start.'
    $('latest').textContent = latest()
    $('bars').innerHTML = sc.map(function (x) {
      var s = x.s, hi = s !== null && s >= 85, ok = s !== null && s >= 75
      var bar = s === null ? '#DCE2DC' : hi ? '#C8924A' : ok ? '#3A4A3A' : '#C9D0CA'
      return '<div><span class="mono" style="font-size:11px;font-weight:600;color:' + (hi ? '#8A5F26' : '#5B635B') + '">' + (s === null ? '–' : s) + '</span><span class="b" style="height:' + (s === null ? 30 : Math.max(10, (s - 20) * 0.9)) + 'px;background:' + bar + '"></span><span class="mono label" style="font-size:10px">' + x.code + '</span></div>'
    }).join('')
    var go = $('go')
    go.className = 'btn ' + (canGo ? 'btn-primary' : '')
    go.style.cssText = canGo ? '' : 'background:#E3E8E3;color:#6A736A;pointer-events:none'
    if (canGo) go.removeAttribute('aria-disabled'); else go.setAttribute('aria-disabled', 'true')
    go.tabIndex = canGo ? 0 : -1
    $('go-note').textContent = canGo ? 'Or keep going for a sharper list' : 'Answer 2 to unlock'

    $('dots').innerHTML = Q.map(function (q, i) {
      var on = i === qi, has = A[q.id] !== undefined
      return '<span style="width:' + (on ? 22 : 8) + 'px;height:6px;border-radius:3px;background:' + (on ? '#3A4A3A' : has ? '#8FA38F' : '#E3E8E3') + ';transition:all .2s"></span>'
    }).join('')

    // Question card
    var qa = $('q-area')
    if (cur) {
      var f = A.f || null, rules = A.rules || {}
      var isOn = function (oi) {
        if (cur.id === 'f') return !!(f && f[FOODK[oi]])
        if (cur.id === 'rules') return !!rules[RULES[oi]]
        return A[cur.id] === oi
      }
      qa.innerHTML =
        '<div><div class="mono xs" style="color:var(--gold-ink)">' + (qi < 6 ? (qi + 1) + ' OF 6' : 'LAST BITS · ' + (qi - 5) + ' OF 3') + '</div>' +
        '<h1 tabindex="-1" id="q-title" style="margin-top:6px;font-size:clamp(26px,3vw,34px);line-height:1.1;letter-spacing:-.035em;font-weight:700">' + esc(cur.title) + '</h1>' +
        '<p class="muted" style="margin-top:6px">' + esc(cur.hint) + '</p></div>' +
        '<div role="group" aria-labelledby="q-title" style="display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(min(' + cur.min + ',100%),1fr))">' +
        cur.opts.map(function (o, oi) {
          return '<button type="button" class="opt" data-opt="' + oi + '" aria-pressed="' + isOn(oi) + '"><span class="key" aria-hidden="true">' + KEYS[oi] + '</span><span><span class="t">' + esc(o[0]) + '</span>' + (o[1] ? '<span class="d">' + esc(o[1]) + '</span>' : '') + '</span></button>'
        }).join('') + '</div>' +
        '<div class="between" style="align-items:center;gap:10px"><div class="row" style="gap:6px">' +
        (qi > 0 ? '<button type="button" class="btn btn-outline btn-sm" data-act="back">Back</button>' : '') +
        '<button type="button" class="btn btn-sm" style="color:var(--label);font-weight:600" data-act="skip">Skip</button></div>' +
        (cur.multi ? '<button type="button" class="btn btn-primary btn-sm" data-act="next">Continue →</button>' : '') + '</div>'
    } else {
      qa.innerHTML =
        '<div class="stack" style="--gap:14px;padding:8px 0"><div class="mono xs" style="color:var(--gold-ink)">ALL DONE</div>' +
        '<h1 tabindex="-1" id="q-title" style="font-size:clamp(26px,3vw,34px);line-height:1.1;letter-spacing:-.035em;font-weight:700">Your shortlist is ready.</h1>' +
        '<p class="muted">Harry or Ben will check it before you see the names on your call.</p>' +
        '<div class="row" style="gap:10px"><a class="btn btn-primary btn-lg" href="/v2/match/results/">See my matches ↗</a><button type="button" class="btn btn-outline btn-lg" data-act="back">Change an answer</button></div></div>'
    }

    $('answered').innerHTML = Q.slice(0, 6).map(function (q, i) {
      var lab = A[q.id] !== undefined ? q.short(A[q.id]) : null
      return '<button type="button" class="ans-chip' + (lab ? ' has' : '') + '" data-go="' + i + '"><span class="m" aria-hidden="true">' + (lab ? '✓' : '○') + '</span>' + esc(lab || q.title.replace('?', '')) + (lab && st.src[q.id] === 'ai' ? '<span class="mono" style="font-size:9px;color:var(--gold-ink)">AI</span>' : '') + '</button>'
    }).join('')

    // Assistant
    var used = usedOf(st.msgs), miss = missingBrief(A), closed = !miss.length || used >= MAX
    $('used').textContent = used
    $('use-dots').innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) { return '<span style="width:8px;height:4px;border-radius:2px;background:' + (i < used ? '#C8924A' : '#2F3A30') + '"></span>' }).join('')
    var lastMsg = st.msgs[st.msgs.length - 1], qrQ = lastMsg && lastMsg.qr && !closed ? qOf(lastMsg.qr) : null
    var log = $('log')
    log.innerHTML = st.msgs.map(function (m) {
      return '<div class="msg ' + (m.r === 'me' ? 'me' : 'ai') + '"><span>' + esc(m.t) + '</span>' + (m.chips && m.chips.length ? '<span class="chips">' + m.chips.map(function (c) { return '<span>✓ ' + esc(c) + '</span>' }).join('') + '</span>' : '') + '</div>'
    }).join('') + (qrQ ? '<div class="row" style="gap:6px">' + qrQ.opts.map(function (o, oi) { return '<button type="button" class="qr" data-qr="' + oi + '">' + esc(o[0]) + '</button>' }).join('') + '</div>' : '')
    log.scrollTop = log.scrollHeight

    var notes = $('notes')
    notes.hidden = !st.notes.length
    notes.innerHTML = '<div class="mono" style="font-size:10px;letter-spacing:.08em;color:var(--gold-soft);margin-bottom:4px">SAVED FOR YOUR CALL · ' + st.notes.length + (st.notes.length === 1 ? ' QUESTION' : ' QUESTIONS') + '</div>' +
      st.notes.map(function (n) { return '<div class="xs" style="color:var(--on-dark-2)">“' + esc(n) + '”</div>' }).join('')
    $('chat').hidden = closed
    $('starters').hidden = st.msgs.length > 1
    $('handover').hidden = !closed
    $('hand-kicker').textContent = !miss.length ? 'BRIEF COMPLETE · NEXT STEP' : 'NEXT STEP'
    $('hand-title').textContent = !miss.length ? 'Your brief is ready. Let’s talk it through.' : 'Over to a human from here.'
    $('hand-body').textContent = 'A free 20-minute call with Harry: your matches by name, the real numbers' + (st.notes.length ? ', and answers to your ' + st.notes.length + ' saved question' + (st.notes.length > 1 ? 's' : '') : '') + '.'
  }

  function focusTitle() { var t = $('q-title'); if (t) t.focus({ preventScroll: true }) }

  document.addEventListener('DOMContentLoaded', function () {
    $('starters').innerHTML = STARTERS.map(function (s, i) { return '<button type="button" class="starter" data-start="' + i + '">' + esc(s[0]) + '</button>' }).join('')
    render()

    $('q-area').addEventListener('click', function (e) {
      var opt = e.target.closest('[data-opt]'), act = e.target.closest('[data-act]')
      var cur = Q[st.q]
      if (opt && cur) {
        var oi = Number(opt.getAttribute('data-opt')), on = opt.getAttribute('aria-pressed') === 'true'
        if (cur.id === 'f') {
          var nf = copy(st.ans.f || {}), k = FOODK[oi]
          if (k === 'any') nf = on ? {} : { any: true }; else { delete nf.any; if (on) delete nf[k]; else nf[k] = true }
          setAns('f', Object.keys(nf).length ? nf : null, false)
        } else if (cur.id === 'rules') {
          var nr = copy(st.ans.rules || {}); nr[RULES[oi]] = !nr[RULES[oi]]; setAns('rules', nr, false)
        } else { setAns(cur.id, oi, true); focusTitle() }
        if (cur.multi) { var b = document.querySelector('[data-opt="' + oi + '"]'); if (b) b.focus() }
      }
      if (act) {
        var a = act.getAttribute('data-act')
        if (a === 'back') set({ q: Math.max(0, st.q - 1) })
        if (a === 'skip') set({ q: Math.min(N, st.q + 1) })
        if (a === 'next') {
          if (cur && cur.id === 'rules' && st.ans.rules === undefined) setAns('rules', {}, true)
          else set({ q: firstOpen(st.ans) > st.q ? firstOpen(st.ans) : st.q + 1 })
        }
        focusTitle()
      }
    })
    $('answered').addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]'); if (!b) return
      set({ q: Number(b.getAttribute('data-go')) }); focusTitle()
    })
    $('log').addEventListener('click', function (e) {
      var b = e.target.closest('[data-qr]'); if (!b) return
      var qrQ = qOf(st.msgs[st.msgs.length - 1].qr), oi = Number(b.getAttribute('data-qr'))
      var n = copy(st.ans), src = copy(st.src); n[qrQ.id] = oi; src[qrQ.id] = 'ai'
      set({ ans: n, src: src, last: qrQ.id, q: firstOpen(n), msgs: st.msgs.concat([{ r: 'me', t: qrQ.opts[oi][0] }, aiReply(n, [qrQ.id])]) })
    })
    $('starters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-start]'); if (b) sendText(STARTERS[Number(b.getAttribute('data-start'))][1])
    })
    $('ai-form').addEventListener('submit', function (e) { e.preventDefault(); sendText($('ai-input').value) })
  })
})()
