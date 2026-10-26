// Franchise Foundry v2: review page. "Reviewed" ticks and your name are remembered
// in this browser only; feedback itself goes through the v2-feedback Netlify form.
(function () {
  'use strict'
  var KEY = 'ffv2-reviewed', NAME = 'ffv2-reviewer'
  var load = function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d } catch (e) { return d } }
  var keep = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }

  document.addEventListener('DOMContentLoaded', function () {
    var cards = [].slice.call(document.querySelectorAll('.review-card'))
    var done = load(KEY, {}), filter = 'all'

    function update() {
      var n = 0
      cards.forEach(function (c) {
        var on = !!done[c.getAttribute('data-page')]
        c.querySelector('.done input').checked = on
        c.classList.toggle('is-done', on)
        if (on) n++
        var k = c.getAttribute('data-kind')
        c.hidden = !(filter === 'all' || filter === k || (filter === 'todo' && !on))
      })
      document.getElementById('done-n').textContent = n
      document.getElementById('total-n').textContent = cards.length
      document.getElementById('done-bar').style.width = Math.round(n / cards.length * 100) + '%'
    }

    cards.forEach(function (c) {
      var page = c.getAttribute('data-page')
      c.querySelector('.done input').addEventListener('change', function (e) { done[page] = e.target.checked; keep(KEY, done); update() })
      c.querySelector('[data-feedback]').addEventListener('click', function () {
        document.getElementById('fb-page').value = page
        document.getElementById('feedback').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        document.getElementById('fb-text').focus({ preventScroll: true })
      })
    })

    var group = document.querySelector('[data-review-filter]')
    group.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return
      filter = b.getAttribute('data-key')
      ;[].forEach.call(group.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', String(x === b)) })
      update()
    })

    var who = document.getElementById('reviewer')
    who.value = load(NAME, '')
    who.addEventListener('change', function () { keep(NAME, who.value) })

    if (new URLSearchParams(location.search).get('sent')) {
      document.getElementById('sent').hidden = false
      history.replaceState(null, '', location.pathname)
    }
    update()
  })
})()
