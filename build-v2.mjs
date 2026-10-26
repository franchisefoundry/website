// Build step: the v2 website preview at /v2/.
// Each page body lives in v2-src/pages/<route>.html and starts with a meta
// comment: <!--meta {"title": "...", "description": "...", "active": "work"} -->
// This wraps it in the shared head, header and footer and writes
// /v2/<route>/index.html, so the header and footer are written once.
// Every v2 page is noindex and /v2/ is disallowed in robots.txt until launch.
// Plain file work, no network: safe to run on every deploy.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'v2-src', 'pages')
const OUT = join(ROOT, 'v2')
const SITE = (process.env.SITE_URL || 'https://franchisefoundry.co.uk').replace(/\/$/, '')
const PORTAL = 'https://portal.franchisefoundry.co.uk'
const log = (...a) => console.log('[build-v2]', ...a)

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const json = o => JSON.stringify(o).replace(/</g, '\\u003c')
const strip = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

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
  if (meta.article) out.push({ '@context': 'https://schema.org', '@type': 'Article', headline: meta.title.split(' · ')[0], author: { '@type': 'Person', name: meta.article.author, url: SITE + '/v2/about/' }, dateModified: meta.article.modified, publisher: { '@type': 'Organization', name: 'Franchise Foundry' } })
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
  writeFileSync(dest, page(meta, src.slice(m[0].length), url))
  n++
}
log(`wrote ${n} pages to /v2/`)
