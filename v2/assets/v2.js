// Franchise Foundry v2: shared page behaviour. Every page reads fine without it.
(function () {
  'use strict'
  var $ = function (s, r) { return (r || document).querySelector(s) }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)) }

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn) }

  ready(function () {
    // Header: "Find a franchise" mega menu and the small-screen menu
    var head = $('[data-header]')
    if (head) {
      var megaBtn = $('.mega-btn', head), mega = $('#mega', head), menuBtn = $('.menu-btn', head)
      var setMega = function (open) { megaBtn.setAttribute('aria-expanded', String(open)); mega.hidden = !open }
      megaBtn.addEventListener('click', function () { setMega(mega.hidden) })
      menuBtn.addEventListener('click', function () {
        var open = !head.classList.contains('open')
        head.classList.toggle('open', open)
        menuBtn.setAttribute('aria-expanded', String(open))
        if (!open) setMega(false)
      })
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || mega.hidden) return
        setMega(false); megaBtn.focus()
      })
      document.addEventListener('click', function (e) { if (!head.contains(e.target)) setMega(false) })
    }

    // FAQ accordions: one open at a time, the first open to start
    $$('[data-faq]').forEach(function (faq) {
      var items = $$('[data-q]', faq)
      var set = function (btn, open) { btn.setAttribute('aria-expanded', String(open)); btn.nextElementSibling.hidden = !open }
      items.forEach(function (btn, i) {
        btn.id = btn.id || 'q-' + Math.random().toString(36).slice(2, 8)
        btn.nextElementSibling.setAttribute('aria-labelledby', btn.id)
        set(btn, i === 0)
        btn.addEventListener('click', function () {
          var open = btn.getAttribute('aria-expanded') !== 'true'
          items.forEach(function (b) { set(b, false) })
          set(btn, open)
        })
      })
    })

    // Home hero: the dark slab widens while you're over The Foundry side
    var hero = $('[data-hero]')
    if (hero) $$('[data-slab]', hero).forEach(function (el) {
      el.addEventListener('mouseenter', function () { hero.classList.add('wide') })
      el.addEventListener('mouseleave', function () { hero.classList.remove('wide') })
    })

    // Toggle groups: aria-pressed pills (single choice) that filter [data-topic] items
    $$('[data-filter]').forEach(function (group) {
      var target = $(group.getAttribute('data-filter'))
      var count = $(group.getAttribute('data-count'))
      var heading = $(group.getAttribute('data-heading'))
      $$('button', group).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-key')
          $$('button', group).forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)) })
          var shown = 0
          $$('[data-topic]', target).forEach(function (el) {
            var on = key === 'all' || el.getAttribute('data-topic') === key
            el.hidden = !on; if (on) shown++
          })
          if (count) count.textContent = shown + ' GUIDES'
          if (heading) heading.textContent = key === 'all' ? 'Latest guides' : btn.textContent
        })
      })
    })

    // Segmented radio groups (role="radio" buttons), optionally swapping a hint or panel
    $$('[data-seg]').forEach(function (group) {
      var radios = $$('[role="radio"]', group)
      var input = group.getAttribute('data-input') && $(group.getAttribute('data-input'))
      var hint = group.getAttribute('data-hint') && $(group.getAttribute('data-hint'))
      var panels = group.getAttribute('data-panels') && $$(group.getAttribute('data-panels'))
      function pick(i, focus) {
        radios.forEach(function (r, j) { r.setAttribute('aria-checked', String(i === j)); r.tabIndex = i === j ? 0 : -1 })
        var r = radios[i]
        if (input) input.value = r.getAttribute('data-value')
        if (hint) hint.placeholder = r.getAttribute('data-hint')
        if (panels) panels.forEach(function (p, j) { p.hidden = j % radios.length !== i })
        if (focus) r.focus()
        group.dispatchEvent(new CustomEvent('seg', { detail: i }))
      }
      radios.forEach(function (r, i) {
        r.addEventListener('click', function () { pick(i) })
        r.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
          if (d) { e.preventDefault(); pick((i + d + radios.length) % radios.length, true) }
        })
      })
      var param = group.getAttribute('data-param') && new URLSearchParams(location.search).get(group.getAttribute('data-param'))
      var start = radios.findIndex(function (r) { return param ? r.getAttribute('data-value') === param : r.getAttribute('aria-checked') === 'true' })
      pick(Math.max(0, start))
    })

    // For brands: what you'd pay us. 20% of the franchise fee, £5k minimum.
    var fee = $('#fee')
    if (fee) {
      var upd = function () {
        var f = Number(fee.value), pct = f * 0.2, ours = Math.max(5, pct), r1 = function (x) { return Math.round(x * 10) / 10 }
        $('#fee-label').textContent = '£' + f + 'k'
        $('#our-fee').textContent = '£' + r1(ours) + 'k'
        $('#fee-note').textContent = pct < 5 ? 'Minimum fee applies (20% would be £' + r1(pct) + 'k)' : '20% of your £' + f + 'k franchise fee'
      }
      fee.addEventListener('input', upd); upd()
    }
  })
})()
