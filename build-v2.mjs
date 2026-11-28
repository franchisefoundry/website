// Build step: the v2 website preview at /v2/.
// Each page body lives in v2-src/pages/<route>.html and starts with a meta
// comment: <!--meta {"title": "...", "description": "...", "active": "work"} -->
// This wraps it in the shared head, header and footer and writes
// /v2/<route>/index.html, so the header and footer are written once.
// Guides come from the same CMS articles as the current blog (content/articles,
// Published only): each gets /v2/guides/<slug>/, and the guides hub and home page
// list them where the page source has a <!--guides:...--> marker.
// Every v2 page is noindex and /v2/ is disallowed in robots.txt until launch.
// Plain file work, no network: safe to run on every deploy.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

const ROOT = process.cwd()
const SRC = join(ROOT, 'v2-src', 'pages')
const OUT = join(ROOT, 'v2')
const SITE = (process.env.SITE_URL || 'https://franchisefoundry.co.uk').replace(/\/$/, '')
const PORTAL = 'https://portal.franchisefoundry.co.uk'
const log = (...a) => console.log('[build-v2]', ...a)

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const json = o => JSON.stringify(o).replace(/</g, '\\u003c')
const strip = s => s.replace(/<[^>]+>/g, '').replace(/&(#39|#x27|quot|amp|lt|gt|nbsp);/g, (m, e) => ({ '#39': "'", '#x27': "'", quot: '"', amp: '&', lt: '<', gt: '>', nbsp: ' ' })[e]).replace(/\s+/g, ' ').trim()

// Only one sector page and one guide are built so far: their links point at the templates.
const SECTOR = '/v2/franchises/coffee/'
const GUIDE = '/v2/guides/how-to-buy-a-franchise/'
const list = (arr, href) => arr.map(t => ({ t, href }))

const NAV = [
  { k: 'work', t: 'Who we work with', href: '/v2/brands/' },
  { k: 'foundry', t: 'The Foundry', href: '/foundry/' },
  { k: 'brands', t: 'For brands', href: '/v2/for-brands/' },
  { k: 'guides', t: 'Guides', href: '/v2/guides/' },
  { k: 'about', t: 'About', href: '/v2/about/' }
]
const MEGA = [
  { h: 'BY SECTOR', items: list(['Coffee & drinks', 'Quick service', 'Asian food', 'Desserts', 'Healthy & bowls'], SECTOR) },
  { h: 'BY BUDGET', items: list(['Under £50k', '£50k to £100k', '£100k to £250k', '£250k+'], SECTOR) },
  { h: 'BY AREA', items: list(['London', 'Manchester', 'Birmingham', 'Leeds', 'All areas'], SECTOR) },
  { h: 'LEARN', items: [{ t: 'How to buy a franchise', href: GUIDE }, { t: 'Fees and royalties explained', href: GUIDE }, { t: 'All guides', href: '/v2/guides/' }] }
]
const FOOT = [
  { h: 'FRANCHISES BY SECTOR', items: list(['Coffee franchises', 'Quick service franchises', 'Asian food franchises', 'Dessert franchises', 'Healthy food franchises'], SECTOR) },
  { h: 'BY BUDGET', items: list(['Under £50k', '£50k to £100k', '£100k to £250k', 'Manager-run franchises'], SECTOR) },
  { h: 'BY AREA', items: list(['London', 'Manchester', 'Birmingham', 'Leeds', 'Bristol'], SECTOR) },
  { h: 'GUIDES', items: [{ t: 'How to buy a franchise', href: GUIDE }, { t: 'Fees and royalties', href: GUIDE }, { t: 'Funding a franchise', href: GUIDE }, { t: 'All guides', href: '/v2/guides/' }] },
  { h: 'COMPANY', items: [{ t: 'Who we work with', href: '/v2/brands/' }, { t: 'For brands', href: '/v2/for-brands/' }, { t: 'For partners', href: '/v2/for-partners/' }, { t: 'About and contact', href: '/v2/about/' }, { t: 'Log in', href: '/v2/login/' }] }
]

const LOGO = (back = '#8FA38F', front = '#3A4A3A', size = 26) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="8" height="15" rx="1" fill="${back}"/><rect x="12.5" y="3" width="8.5" height="18" rx="1" fill="${front}"/></svg>`
const links = items => items.map(i => `<li><a href="${i.href}">${esc(i.t)}</a></li>`).join('')

function strip_(route) {
  return `<div class="v2-strip"><div class="wrap"><span><b>V2 PREVIEW</b> · Not live and hidden from search. The current site is unchanged.</span><span><a href="/v2/preview/">All v2 pages</a> · <a href="/">Current site</a></span></div></div>`
}

function header(active) {
  const nav = NAV.map(l => `<a href="${l.href}"${l.k === active ? ' aria-current="page"' : ''}>${l.t}</a>`).join('\n      ')
  const mega = MEGA.map(c => `<div class="mega-col"><h3>${c.h}</h3>${c.items.map(i => `<a href="${i.href}">${esc(i.t)}</a>`).join('')}</div>`).join('')
  return `<header class="site-h" data-header>
  <div class="bar-in">
    <a class="brand" href="/v2/">${LOGO()}<b>Franchise Foundry</b></a>
    <nav class="nav" id="site-nav" aria-label="Main">
      <button type="button" class="mega-btn${active === 'find' ? ' on' : ''}" aria-expanded="false" aria-controls="mega">Find a franchise <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
      ${nav}
      <a class="m-only" href="/v2/login/">Log in</a>
      <a class="m-only" href="/v2/match/" style="font-weight:700">Start matching ↗</a>
    </nav>
    <div class="h-actions">
      <a class="login" href="/v2/login/">Log in</a>
      <a class="btn btn-primary btn-sm" href="/v2/match/">Start matching <span aria-hidden="true">↗</span></a>
      <button type="button" class="menu-btn" aria-expanded="false" aria-controls="site-nav">Menu</button>
    </div>
  </div>
  <div class="mega" id="mega" hidden>
    <div class="mega-in">
      <a class="mega-cta" href="/v2/match/"><span class="k">◆ FREE · ABOUT 4 MINUTES</span><span class="t">Get matched with brands that fit you</span><span class="go">Start matching ↗</span></a>
      ${mega}
    </div>
  </div>
</header>`
}

function footer() {
  return `<footer class="site-f">
  <div class="wrap in">
    <div class="cols">
      <div class="stack" style="--gap:12px">
        <span class="row" style="gap:10px;color:#fff">${LOGO('#A9C2A3', '#FFFFFF', 24)}<b style="font-weight:800;font-size:17px;letter-spacing:-.02em">Franchise Foundry</b></span>
        <span style="color:var(--gold-soft);font-weight:600">Discover. Connect. Franchise.</span>
        <a href="mailto:connect@franchisefoundry.co.uk" style="color:#fff;text-decoration:none">connect@franchisefoundry.co.uk</a>
      </div>
      ${FOOT.map(c => `<div><h2>${c.h}</h2><ul>${links(c.items)}</ul></div>`).join('\n      ')}
    </div>
    <div class="legal">
      <span>© ${new Date().getFullYear()} Franchise Foundry · [Company number] · [Registered address]</span>
      <span class="row" style="gap:20px"><a href="${PORTAL}/privacy">Privacy</a><a href="/terms.html">Terms</a><a href="${PORTAL}/privacy#cookies">Cookies</a></span>
    </div>
  </div>
</footer>`
}

// Structured data the brief asks for, built from the page itself.
function schema(meta, body, url) {
  const out = []
  if (meta.org) out.push({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Franchise Foundry', url: SITE + '/', email: 'connect@franchisefoundry.co.uk', slogan: 'Discover. Connect. Franchise.', founder: [{ '@type': 'Person', name: 'Harry' }, { '@type': 'Person', name: 'Ben' }] })
  const qa = [...body.matchAll(/<button[^>]*data-q[^>]*>([\s\S]*?)<\/button>\s*<p class="a"[^>]*>([\s\S]*?)<\/p>/g)]
  if (qa.length) out.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(m => ({ '@type': 'Question', name: strip(m[1]), acceptedAnswer: { '@type': 'Answer', text: strip(m[2]) } })) })
  const crumb = body.match(/<nav aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)
  if (crumb) {
    const items = [...crumb[1].matchAll(/<(?:a href="([^"]*)"|span aria-current="page")[^>]*>([^<]*)</g)]
    out.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: strip(m[2]), item: SITE + (m[1] || url) })) })
  }
  if (meta.article) {
    const a = meta.article, org = a.author === 'Franchise Foundry'
    out.push({ '@context': 'https://schema.org', '@type': 'Article', headline: meta.title.split(' · ')[0], author: org ? { '@type': 'Organization', name: a.author, url: SITE + '/' } : { '@type': 'Person', name: a.author, url: SITE + '/v2/about/' }, ...(a.published ? { datePublished: a.published } : {}), dateModified: a.modified, publisher: { '@type': 'Organization', name: 'Franchise Foundry' } })
  }
  return out.map(o => `<script type="application/ld+json">${json(o)}</script>`).join('\n')
}

function page(meta, body, url) {
  const app = meta.layout === 'app'
  const scripts = ['/v2/assets/v2.js', ...(meta.scripts || [])].map(s => `<script src="${s}" defer></script>`).join('\n')
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:type" content="website">
<link rel="icon" type="image/png" href="/images/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/v2/assets/v2.css">
${schema(meta, body, url)}
${scripts}
</head>
<body${meta.bodyClass ? ` class="${meta.bodyClass}"` : ''}>
<a class="skip" href="#main">Skip to content</a>
${strip_()}
${app ? '' : header(meta.active) + '\n'}${body.trim()}
${app ? '' : footer() + '\n'}</body>
</html>
`
}

function walk(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : f.endsWith('.html') ? [p] : []
  })
}

// ── Guides from the CMS ─────────────────────────────────────────────────────
const ARTICLES = join(ROOT, 'content', 'articles')
const ukDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const iso = d => new Date(d).toISOString()
const slugify = t => {
  const full = String(t).toLowerCase().replace(/[’']/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (full.length <= 64) return full
  const cut = full.slice(0, 65)
  return cut.slice(0, cut.lastIndexOf('-'))
}
const topicKey = c => slugify(c || 'Guides')
const initials = n => n === 'Franchise Foundry' ? 'FF' : String(n).trim().charAt(0).toUpperCase()

function loadGuides() {
  if (!existsSync(ARTICLES)) return []
  const out = []
  for (const f of readdirSync(ARTICLES).filter(f => f.endsWith('.md'))) {
    const { data, content } = matter(readFileSync(join(ARTICLES, f), 'utf8'))
    const status = data.status || (data.draft ? 'Draft' : 'Published')
    if (String(status).toLowerCase() !== 'published') continue
    const title = data.title || 'Untitled'
    out.push({
      file: f, title, content,
      slug: data.slug ? slugify(data.slug) : slugify(title),
      oldUrl: '/articles/' + (data.slug || f.replace(/\.md$/, '')).toLowerCase().replace(/[^a-z0-9-]/g, '-') + '.html',
      excerpt: data.excerpt || data.description || '',
      category: data.category || 'Guides',
      author: data.author || 'Franchise Foundry',
      date: data.date || new Date().toISOString(),
      featured: data.featured === true,
      minutes: Math.max(1, Math.round(content.trim().split(/\s+/).length / 200)),
    })
  }
  out.sort((a, b) => new Date(b.date) - new Date(a.date))
  const seen = new Set()
  for (const g of out) { while (seen.has(g.slug) || g.slug === 'how-to-buy-a-franchise') g.slug += '-2'; seen.add(g.slug) }
  return out
}

const byline = (g, dark) => `<span class="by"><span class="avatar" style="--s:26px;font-size:${g.author === 'Franchise Foundry' ? 9 : 11}px${dark ? ';background:var(--gold);color:var(--ink)' : ''}">${esc(initials(g.author))}</span>${esc(g.author)} · ${esc(ukDate(g.date))}</span>`
const guideCard = g => `<a class="card stack guide-card sm" data-topic="${topicKey(g.category)}" href="/v2/guides/${g.slug}/"><span class="kicker green">${esc(g.category.toUpperCase())} · ${g.minutes} MIN</span><span class="gt">${esc(g.title)}</span>${byline(g)}</a>`

function guidePage(g, all) {
  // Body: CMS markdown, h2s get ids for the contents list, and the matching prompt sits halfway down.
  let html = marked.parse(g.content)
  const toc = []
  html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
    const id = 's' + (toc.length + 1)
    toc.push({ id, text: strip(inner) })
    return `<h2 id="${id}">${inner}</h2>`
  })
  const cta = `<a class="dark between inline-cta" href="/v2/match/"><span><span class="kicker" style="display:block">◆ FREE · ABOUT 4 MINUTES</span><span style="display:block;margin-top:4px;font-size:19px;font-weight:700">See which franchises fit your budget and area</span></span><span class="btn btn-gold btn-sm" style="min-height:46px">Start matching ↗</span></a>`
  if (toc.length >= 3) {
    const at = html.indexOf(`<h2 id="s${Math.ceil(toc.length / 2) + 1}">`)
    html = html.slice(0, at) + cta + '\n' + html.slice(at)
  } else html += cta
  const next = all.filter(x => x !== g && x.category === g.category).concat(all.filter(x => x !== g && x.category !== g.category)).slice(0, 3)
  const body = `<main id="main" style="font-size:16px;line-height:1.65">
  <header class="rule-b">
    <div class="wrap-narrow" style="padding-top:24px;padding-bottom:48px">
      <nav aria-label="Breadcrumb" class="crumb"><a href="/v2/">Home</a><span aria-hidden="true">/</span><a href="/v2/guides/">Guides</a><span aria-hidden="true">/</span><span aria-current="page">${esc(g.category)}</span></nav>
      <h1 style="margin-top:28px;font-size:clamp(34px,4.6vw,56px);line-height:1.02;letter-spacing:-.045em;font-weight:700;max-width:860px">${esc(g.title)}</h1>
      ${g.excerpt ? `<p class="muted" style="margin-top:18px;font-size:20px;line-height:1.5;max-width:760px">${esc(g.excerpt)}</p>` : ''}
      <div class="row mt-24" style="gap:12px 20px">
        <span class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar" style="font-size:${g.author === 'Franchise Foundry' ? 11 : 13}px">${esc(initials(g.author))}</span><b style="font-size:15px">${esc(g.author)}</b></span>
        <span class="mono xs label">${esc(ukDate(g.date).toUpperCase())} · ${g.minutes} MIN READ</span>
      </div>
    </div>
  </header>
  <div class="wrap-narrow guide-body">
    ${toc.length >= 3 ? `<nav aria-label="On this page" class="toc"><div class="kicker" style="margin-bottom:10px">ON THIS PAGE</div><ol>${toc.map((t, i) => `<li><a href="#${t.id}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(t.text)}</a></li>`).join('')}</ol></nav>` : ''}
    <article class="prose cms">
${html}
      <div class="card row" style="margin-top:48px;gap:16px;padding:22px;border-radius:18px">
        <span class="avatar" style="--s:56px;font-size:15px">${esc(initials(g.author))}</span>
        <div style="flex:1 1 280px"><b>Written by ${esc(g.author)}</b><div class="muted" style="font-size:14px">Built by hospitality operators. Free advice and matching for franchisees: brands pay us only when someone signs.</div></div>
        <a class="btn btn-tint btn-sm" href="/v2/about/">About us</a>
      </div>
    </article>
  </div>
  ${next.length ? `<section class="surface" style="border-bottom:0"><div class="wrap-narrow" style="padding-top:56px;padding-bottom:72px"><h2 style="font-size:26px;letter-spacing:-.03em;font-weight:700;margin-bottom:18px">Read next</h2><div class="auto" style="--min:300px;--gap:14px">${next.map(x => `<a class="card stack" style="--gap:8px;padding:20px;border-radius:14px" href="/v2/guides/${x.slug}/"><span class="kicker green">${esc(x.category.toUpperCase())}</span><b style="font-size:18px;line-height:1.25">${esc(x.title)}</b></a>`).join('')}</div></div></section>` : ''}
</main>`
  return page({ title: `${g.title} · Franchise Foundry`, description: g.excerpt || g.title, active: 'guides', article: { author: g.author, published: iso(g.date), modified: iso(g.date) } }, body, `/v2/guides/${g.slug}/`)
}

const GUIDES = loadGuides()
const FEATURED = GUIDES.find(g => g.featured) || GUIDES[0]
const TOPICS = [...new Set(GUIDES.map(g => g.category))]
const MARKERS = {
  'guides:filters': () => ['<button type="button" class="pill" data-key="all" aria-pressed="true">All</button>'].concat(TOPICS.map(t => `<button type="button" class="pill" data-key="${topicKey(t)}" aria-pressed="false">${esc(t)}</button>`)).join('\n        '),
  'guides:feature': () => FEATURED ? `<a class="dark feature" href="/v2/guides/${FEATURED.slug}/">
      <span class="ph" style="min-height:280px;border-radius:0;padding:18px">[PHOTO: A REAL SITE OR DISCOVERY DAY]</span>
      <span class="stack" style="--gap:14px;padding:36px;justify-content:center">
        <span class="kicker">FEATURED · ${esc(FEATURED.category.toUpperCase())}</span>
        <span style="font-size:clamp(28px,3.2vw,38px);line-height:1.08;font-weight:700;letter-spacing:-.04em">${esc(FEATURED.title)}</span>
        ${FEATURED.excerpt ? `<span style="color:var(--on-dark);font-size:16px">${esc(FEATURED.excerpt)}</span>` : ''}
        <span style="font-size:13px;color:var(--on-dark-2)">${byline(FEATURED, true)}</span>
      </span>
    </a>` : '',
  'guides:list': () => GUIDES.filter(g => g !== FEATURED).map(guideCard).join('\n      '),
  'guides:count': () => `${GUIDES.length - (FEATURED ? 1 : 0)} GUIDES`,
  'guides:latest': () => GUIDES.slice(0, 3).map(g => guideCard(g).replace(' sm"', '"')).join('\n      '),
}
const fill = src => src.replace(/<!--(guides:[a-z]+)-->/g, (m, k) => MARKERS[k] ? MARKERS[k]() : m)

for (const g of GUIDES) {
  const dest = join(OUT, 'guides', g.slug, 'index.html')
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, guidePage(g, GUIDES))
}
// Old blog address → new guide address, for the redirects at launch.
writeFileSync(join(ROOT, 'v2-src', 'guide-redirects.txt'), '# /articles/ pages and their v2 guide, for _redirects at launch (generated by build-v2.mjs)\n' + GUIDES.map(g => `${g.oldUrl}  /guides/${g.slug}/  301`).join('\n') + '\n')
log(`wrote ${GUIDES.length} guides from content/articles`)

let n = 0
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8')
  const m = src.match(/^<!--meta\s+([\s\S]*?)-->\s*/)
  if (!m) { log('skipped (no meta comment):', relative(ROOT, file)); continue }
  const meta = JSON.parse(m[1])
  const route = relative(SRC, file).replace(/\.html$/, '').replace(/(^|\/)index$/, '')
  const url = '/v2/' + (route ? route + '/' : '')
  const dest = join(OUT, route, 'index.html')
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, page(meta, fill(src.slice(m[0].length)), url))
  n++
}
log(`wrote ${n} pages to /v2/`)
