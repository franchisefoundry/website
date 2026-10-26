// Franchise Foundry v2: brand portal preview (candidate inbox). Example candidates only.
// The real version belongs in the portal app (phase 3); this shows the flow.
(function () {
  'use strict'
  var $ = function (id) { return document.getElementById(id) }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }

  var C = [
    { t: 'Candidate · Manchester', d: 'Ex pub kitchen manager · wants 2–3 sites', fit: 93, st: 'READY TO MEET', when: '2H AGO',
      brief: 'Six years running a busy pub kitchen, so long shifts and tight margins are familiar. Plans to work the floor for year one, then hire a manager and open a second site within three years. £120k to invest, with funds confirmed by a Foundry lender. Looked at four brands with us and put you first because of your second-site support.',
      why: ['Budget sits in your £110k to £150k range', 'Wants to grow to 2–3 sites, matches your territory plan', 'Kitchen ops background, fits your hands-on first year'],
      asks: ['How long until owners typically step back?', 'Real P&Ls from sites outside London', 'What a second site costs and when you’d allow it'] },
    { t: 'Candidate · Leeds', d: 'Retail area manager · first franchise', fit: 88, st: 'READY TO MEET', when: 'YESTERDAY',
      brief: 'Twelve years in retail, the last five managing eight stores. New to food, but strong on people and numbers. Wants one site run well before deciding on more. £95k ready now, lender pre-check passed.',
      why: ['Multi-site management experience', 'Funds ready now', 'Leeds territory is open'],
      asks: ['Training for someone new to food', 'Typical staffing in year one', 'Support in the first 90 days'] },
    { t: 'Candidate · Bristol', d: 'Couple · career change from finance', fit: 86, st: 'READY TO MEET', when: '3 DAYS AGO',
      brief: 'A couple leaving finance roles to run a business together. One full time from day one, one joining after six months. £150k between them, part savings, part loan in principle.',
      why: ['Top of your budget range', 'Two owners on site, strong cover', 'Clear on the numbers, asked the right questions'],
      asks: ['Splitting roles between two owners', 'How the royalty is calculated', 'Exit and resale terms'] },
    { t: 'Candidate · Birmingham', d: 'Ex operations director · prepping', fit: 84, st: 'PREPPING WITH US', when: 'CALL THU', prepping: true,
      brief: 'Brief will appear after their call with Ben on Thursday.', why: ['[After call]'], asks: ['[After call]'] }
  ]
  var R = ['Budget too low', 'Wrong area', 'Not enough experience', 'Wrong growth plan', 'Timing']
  var st = { sel: 0, mode: 'none', reasons: {} }

  function check(k, ok, v, by) {
    return '<div style="padding:12px 14px;border-radius:12px;background:' + (ok ? 'var(--tint)' : '#fff') + ';border:1px solid ' + (ok ? 'var(--tint)' : 'var(--line)') + '">' +
      '<div class="mono" style="font-size:10px;letter-spacing:.06em;color:' + (ok ? 'var(--ok)' : 'var(--gold-ink)') + '">' + (ok ? '✓' : '○') + ' ' + k + '</div>' +
      '<div style="margin-top:2px;font-size:14px;font-weight:600">' + v + '</div><div class="label" style="font-size:11px">' + by + '</div></div>'
  }

  function render() {
    var c = C[st.sel], ready = !c.prepping
    $('list').innerHTML = C.map(function (x, i) {
      var on = st.sel === i
      return '<button type="button" class="cand" data-sel="' + i + '" aria-pressed="' + on + '">' +
        '<span class="between mono" style="align-items:center;align-self:stretch;font-size:10px;letter-spacing:.06em;flex-wrap:nowrap"><span style="color:' + (x.prepping ? 'var(--gold-ink)' : 'var(--ok)') + '">● ' + x.st + '</span><span class="label">' + x.when + '</span></span>' +
        '<span class="between" style="align-items:baseline;align-self:stretch;flex-wrap:nowrap"><b>' + esc(x.t) + '</b><span class="mono" style="font-size:18px;font-weight:600;color:var(--green)">' + x.fit + '</span></span>' +
        '<span class="xs muted">' + esc(x.d) + '</span></button>'
    }).join('')
    $('c-t').textContent = c.t
    $('c-d').textContent = c.d
    $('c-fit').textContent = c.fit
    $('c-brief').textContent = c.brief
    $('c-why').innerHTML = c.why.map(function (w) { return '<div style="padding:7px 0;border-top:1px solid var(--line);font-size:14px">' + esc(w) + '</div>' }).join('')
    $('c-asks').innerHTML = c.asks.map(function (w) { return '<div style="padding:7px 0;border-top:1px solid var(--cream-line);font-size:14px;color:var(--cream-ink)">' + esc(w) + '</div>' }).join('')
    $('checks').innerHTML =
      check('FUNDS', ready, ready ? 'Verified' : 'Pending', ready ? 'Foundry lender pre-check' : 'After call') +
      check('CALL WITH FOUNDER', ready, ready ? 'Done' : 'Thursday', ready ? '20 min with Harry' : 'With Ben') +
      check('BRIEFED ON YOUR MODEL', ready, ready ? 'Yes' : 'Not yet', 'Fees, hours, support') +
      check('TERRITORY', true, 'Open', 'Checked against your map')
    $('undecided').hidden = !(st.mode === 'none' && ready)
    $('accepted').hidden = st.mode !== 'accept'
    $('passing').hidden = st.mode !== 'pass'
    $('reasons').innerHTML = R.map(function (l, i) { return '<button type="button" class="pill" data-reason="' + i + '" aria-pressed="' + !!st.reasons[i] + '">' + l + '</button>' }).join('')
  }

  document.addEventListener('DOMContentLoaded', function () {
    render()
    $('list').addEventListener('click', function (e) { var b = e.target.closest('[data-sel]'); if (b) { st = { sel: Number(b.getAttribute('data-sel')), mode: 'none', reasons: {} }; render() } })
    $('reasons').addEventListener('click', function (e) { var b = e.target.closest('[data-reason]'); if (b) { var i = b.getAttribute('data-reason'); st.reasons[i] = !st.reasons[i]; render(); $('reasons').children[i].focus() } })
    document.querySelector('.inbox-main').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mode]'); if (!b) return
      st.mode = b.getAttribute('data-mode'); if (st.mode === 'none') st.reasons = {}
      render()
    })
  })
})()
