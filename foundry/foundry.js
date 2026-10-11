/* The Foundry: shared front-end for the public marketplace pages.
 * Talks to the portal's public Foundry API. Every value from the API is
 * escaped before it touches the DOM. No framework, no build step. */
(function () {
  'use strict'

  var API = document.documentElement.getAttribute('data-api') || 'https://portal.franchisefoundry.co.uk'
  var LIST_KEY = 'ff_web_list'

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key)
      if (val === null) localStorage.removeItem(key)
      else localStorage.setItem(key, val)
    } catch (e) { return null }
  }

  // Private preview: ?preview=<secret> once, remembered in this browser.
  ;(function () {
    var url = new URL(location.href)
    var p = url.searchParams.get('preview')
    if (p) {
      store('ff_preview', p)
      url.searchParams.delete('preview')
      history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
  })()

  function session() {
    var s = store('ff_session')
    if (!s) {
      s = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2))
      store('ff_session', s)
    }
    return s
  }

  function headers(json) {
    var h = { 'x-foundry-session': session() }
    var p = store('ff_preview')
    if (p) h['x-foundry-preview'] = p
    if (json) h['Content-Type'] = 'application/json'
    return h
  }

  function api(path, opts) {
    opts = opts || {}
    var init = { method: opts.method || 'GET', headers: headers(!!opts.body) }
    if (opts.body) init.body = JSON.stringify(opts.body)
    return fetch(API + path, init).then(function (res) {
      return res.json().catch(function () { return null }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data }
      })
    }).catch(function () { return { ok: false, status: 0, data: null } })
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  function qs(name) { return new URL(location.href).searchParams.get(name) || '' }

  /** When the API says 404 the marketplace is switched off for this browser. */
  function comingSoon() {
    var main = document.querySelector('main')
    if (main) main.innerHTML = '<div class="soon"><h1>The Foundry<span class="accent">.</span></h1>' +
      '<p>Vetted partners for franchisees, with member deals. Coming soon.</p>' +
      '<p style="margin-top:20px"><a class="btn btn-green" href="/">Back to Franchise Foundry</a></p></div>'
    var strip = document.querySelector('.preview-strip'); if (strip) strip.hidden = true
  }

  /** Is The Foundry switched on for this browser? (live, or preview with the secret) */
  function gate() {
    return api('/api/foundry/parse?q=').then(function (r) {
      if (r.ok) { markPreview(); return true }
      comingSoon(); return false
    })
  }

  function markPreview() {
    if (!store('ff_preview')) return
    var strip = document.querySelector('.preview-strip'); if (strip) strip.hidden = false
  }

  // ── Intro list (basket) ───────────────────────────────────────
  function list() { try { return JSON.parse(store(LIST_KEY) || '[]') } catch (e) { return [] } }
  function saveList(items) { store(LIST_KEY, JSON.stringify(items)); document.dispatchEvent(new CustomEvent('ff:list')) }
  function inList(id) { return list().some(function (i) { return i.id === id }) }
  function toggleList(item, searchId) {
    var items = list()
    if (items.some(function (i) { return i.id === item.id })) saveList(items.filter(function (i) { return i.id !== item.id }))
    else {
      items.push(item); saveList(items)
      api('/api/foundry/events', { method: 'POST', body: { kind: 'add_to_list', partnerId: item.id, searchId: searchId || null } })
    }
  }
  function removeFromList(id) { saveList(list().filter(function (i) { return i.id !== id })) }

  function monogram(name) { return '<span class="mono-badge" aria-hidden="true">' + esc(String(name || '?').charAt(0)) + '</span>' }
  function trust(level) {
    var l = { recommended: 'Recommended', trusted: 'Trusted', listed: 'Listed' }[level] || 'Listed'
    return '<span class="trust ' + esc(level) + '">' + l + '</span>'
  }

  window.Foundry = {
    api: api, esc: esc, qs: qs, gate: gate, comingSoon: comingSoon, markPreview: markPreview,
    list: list, inList: inList, toggleList: toggleList, removeFromList: removeFromList, saveList: saveList,
    monogram: monogram, trust: trust,
  }
})()

/* Intro request dialog, shared by Results and the partner profile. */
;(function () {
  'use strict'
  var F = window.Foundry
  var esc = F.esc

  function open(items, opts) {
    opts = opts || {}
    var callTime = 'mornings'
    var overlay = document.createElement('div')
    overlay.className = 'overlay'
    overlay.innerHTML =
      '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ff-dlg-h" tabindex="-1">' +
        '<div class="dialog-h"><h2 id="ff-dlg-h">Request ' + items.length + ' ' + (items.length === 1 ? 'intro' : 'intros') + '</h2>' +
        '<button type="button" data-close aria-label="Close">×</button></div>' +
        '<form class="dialog-b" novalidate>' +
          items.map(function (i, n) {
            return '<div class="pcard"><div class="top">' + F.monogram(i.name) +
              '<div style="flex:1;min-width:0"><b>' + esc(i.name) + '</b><div class="cat">' + esc(i.categoryLabel) + '</div></div>' +
              (i.deal ? '<span class="deal">' + esc(i.deal) + '</span>' : '') + '</div>' +
              '<label class="field">What do you need from them?<textarea rows="2" maxlength="1000" data-need="' + n + '">' + esc(opts.query || '') + '</textarea></label></div>'
          }).join('') +
          '<div class="grid2">' +
            '<label class="field">Your name<input name="name" autocomplete="name" required></label>' +
            '<label class="field">Email<input name="email" type="email" autocomplete="email" required></label>' +
            '<label class="field">Phone <span style="font-weight:400;color:var(--ink-3)">(optional)</span><input name="phone" type="tel" autocomplete="tel"></label>' +
          '</div>' +
          '<fieldset style="border:0"><legend class="field" style="margin-bottom:8px">Best time for a call</legend><div class="seg">' +
            [['mornings', 'Mornings'], ['afternoons', 'Afternoons'], ['evenings', 'Evenings']].map(function (t) {
              return '<button type="button" data-time="' + t[0] + '" aria-pressed="' + (t[0] === callTime) + '">' + t[1] + '</button>'
            }).join('') +
          '</div></fieldset>' +
          '<label class="check"><input type="checkbox" name="consent">Share my details with ' + (items.length === 1 ? 'this partner' : 'these ' + items.length + ' partners') + ' so they can contact me. I can withdraw at any time.</label>' +
          '<label class="check"><input type="checkbox" name="marketing">Send me occasional Franchise Foundry news. Optional.</label>' +
          '<div class="err" role="alert" hidden></div>' +
          '<button type="submit" class="btn btn-gold btn-block" style="min-height:52px">Send requests →</button>' +
          '<p style="font-size:12px;color:var(--ink-3)">No account needed. We’ll email you a link to confirm, then we brief the partners. See our <a href="/terms.html">terms</a>.</p>' +
        '</form></div>'
    document.body.appendChild(overlay)
    var dlg = overlay.querySelector('.dialog')
    var form = overlay.querySelector('form')
    var err = overlay.querySelector('.err')
    dlg.focus()

    function close() { overlay.remove(); document.removeEventListener('keydown', onKey) }
    function onKey(e) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    overlay.addEventListener('click', function (e) { if (e.target === overlay || e.target.hasAttribute('data-close')) close() })
    overlay.querySelectorAll('[data-time]').forEach(function (b) {
      b.addEventListener('click', function () {
        callTime = b.getAttribute('data-time')
        overlay.querySelectorAll('[data-time]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)) })
      })
    })

    form.addEventListener('submit', function (e) {
      e.preventDefault()
      err.hidden = true
      var fd = new FormData(form)
      if (!String(fd.get('name') || '').trim()) return fail('Please add your name.')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fd.get('email') || '').trim())) return fail('Please enter a valid email address.')
      if (!fd.get('consent')) return fail('Please confirm we can share your details with the partners.')
      var btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…'
      F.api('/api/foundry/intros', { method: 'POST', body: {
        partners: items.map(function (i, n) { return { id: i.id, need: form.querySelector('[data-need="' + n + '"]').value } }),
        name: String(fd.get('name')).trim(), email: String(fd.get('email')).trim(), phone: String(fd.get('phone') || '').trim(),
        marketing: !!fd.get('marketing'), consent: true, callTime: callTime, searchId: opts.searchId || null, q: opts.query || '',
      } }).then(function (r) {
        if (!r.ok) { btn.disabled = false; btn.textContent = 'Send requests →'; return fail((r.data && r.data.error) || 'Something went wrong. Please try again.') }
        if (opts.onSent) opts.onSent()
        dlg.innerHTML = '<div class="dialog-b" style="padding:28px 24px">' +
          '<span class="ok-ico" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2f7a4a" stroke-width="2.5" stroke-linecap="round"><path d="M4 7l8 6 8-6M4 7v10h16V7"/></svg></span>' +
          '<h2 class="h-big" id="ff-dlg-h">Check your email<span class="accent">.</span></h2>' +
          '<p>We’ve sent a link to <b>' + esc(r.data.email) + '</b>. Click it to confirm and we’ll brief ' + (items.length === 1 ? 'the partner' : 'all ' + items.length + ' partners') + ' straight away.</p>' +
          '<p style="font-size:13px;color:var(--ink-3)">Nothing is shared until you confirm. Can’t see it? Check spam.</p>' +
          '<button type="button" class="btn btn-green" data-close>Done</button></div>'
      })
      function fail(msg) { err.textContent = msg; err.hidden = false; return false }
    })
  }

  window.Foundry.openIntroDialog = open
})()

/* "Ask us to source one": no partner yet, so just who they are and consent. */
;(function () {
  'use strict'
  var F = window.Foundry
  var esc = F.esc

  function open(opts) {
    var overlay = document.createElement('div')
    overlay.className = 'overlay'
    overlay.innerHTML =
      '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ff-src-h" tabindex="-1">' +
        '<div class="dialog-h"><h2 id="ff-src-h">We’ll find you one</h2>' +
        '<button type="button" data-close aria-label="Close">×</button></div>' +
        '<form class="dialog-b" novalidate>' +
          (opts.label ? '<p style="margin:0;color:var(--ink-2)">' + esc(opts.label) + ' Tell us where to reach you and we’ll come back with someone we’d back.</p>' : '') +
          '<label class="field">Anything we should know? <span style="font-weight:400;color:var(--ink-3)">(optional)</span><textarea name="note" rows="2" maxlength="500"></textarea></label>' +
          '<div class="grid2">' +
            '<label class="field">Your name<input name="name" autocomplete="name" required></label>' +
            '<label class="field">Email<input name="email" type="email" autocomplete="email" required></label>' +
          '</div>' +
          '<label class="check"><input type="checkbox" name="consent">Contact me about this, and share my details with the partner you find. I can withdraw at any time.</label>' +
          '<div class="err" role="alert" hidden></div>' +
          '<button type="submit" class="btn btn-gold btn-block" style="min-height:52px">Find me a partner →</button>' +
          '<p style="font-size:12px;color:var(--ink-3)">No account needed. We’ll email you a link to confirm first. See our <a href="/terms.html">terms</a>.</p>' +
        '</form></div>'
    document.body.appendChild(overlay)
    var dlg = overlay.querySelector('.dialog')
    var form = overlay.querySelector('form')
    var err = overlay.querySelector('.err')
    dlg.focus()

    function close() { overlay.remove(); document.removeEventListener('keydown', onKey) }
    function onKey(e) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    overlay.addEventListener('click', function (e) { if (e.target === overlay || e.target.hasAttribute('data-close')) close() })

    form.addEventListener('submit', function (e) {
      e.preventDefault()
      err.hidden = true
      var fd = new FormData(form)
      if (!String(fd.get('name') || '').trim()) return fail('Please add your name.')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fd.get('email') || '').trim())) return fail('Please enter a valid email address.')
      if (!fd.get('consent')) return fail('Please confirm we can contact you about this.')
      var btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…'
      var note = String(fd.get('note') || '').trim()
      F.api('/api/foundry/gap', { method: 'POST', body: {
        need: opts.need, area: opts.area || null, q: [opts.query || '', note].filter(Boolean).join(' · '), searchId: opts.searchId || null,
        name: String(fd.get('name')).trim(), email: String(fd.get('email')).trim(), consent: true,
      } }).then(function (r) {
        if (!r.ok) { btn.disabled = false; btn.textContent = 'Find me a partner →'; return fail((r.data && r.data.error) || 'Something went wrong. Please try again.') }
        if (opts.onSent) opts.onSent()
        dlg.innerHTML = '<div class="dialog-b" style="padding:28px 24px">' +
          '<span class="ok-ico" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2f7a4a" stroke-width="2.5" stroke-linecap="round"><path d="M4 7l8 6 8-6M4 7v10h16V7"/></svg></span>' +
          '<h2 class="h-big" id="ff-src-h">Check your email<span class="accent">.</span></h2>' +
          '<p>We’ve sent a link to <b>' + esc((r.data && r.data.email) || String(fd.get('email')).trim()) + '</b>. Confirm it and we’ll start looking.</p>' +
          '<p style="font-size:13px;color:var(--ink-3)">Can’t see it? Check spam.</p>' +
          '<button type="button" class="btn btn-green" data-close>Done</button></div>'
      })
      function fail(msg) { err.textContent = msg; err.hidden = false; return false }
    })
  }

  window.Foundry.openSourceDialog = open
})()
