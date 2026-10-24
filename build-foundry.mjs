// Build step: pre-build The Foundry's partner pages so Google can read them.
// Asks the portal for every live partner (GET /api/foundry/export) and writes
// /foundry/partners/<slug>/index.html plus the Browse page at /foundry/partners/.
// The portal stays the source of truth: these pages are a copy, rebuilt when a
// partner changes (the portal pings this site's build hook).
//
//   FOUNDRY_BUILD_TOKEN  shared secret, same value on the portal (required)
//   FOUNDRY_API          defaults to https://portal.franchisefoundry.co.uk
//   SITE_URL             defaults to https://franchisefoundry.co.uk
//
// Preview: demo partners only, every page noindex. Live: real partners,
// indexable, added to the sitemap, and /foundry/ opened up in robots.txt.
// Never fails the deploy: if the portal can't be reached the pages render live.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const ROOT = process.cwd()
const require = createRequire(import.meta.url)
require(join(ROOT, 'foundry', 'render.js'))
const R = globalThis.FoundryRender

const API = (process.env.FOUNDRY_API || 'https://portal.franchisefoundry.co.uk').replace(/\/$/, '')
const SITE = (process.env.SITE_URL || 'https://franchisefoundry.co.uk').replace(/\/$/, '')
const TOKEN = process.env.FOUNDRY_BUILD_TOKEN || ''
const OUT = join(ROOT, 'foundry', 'partners')
const TEMPLATE = readFileSync(join(ROOT, 'foundry', 'partner.html'), 'utf8')
const log = (...a) => console.log('[build-foundry]', ...a)

const attr = s => R.esc(s)
const json = o => JSON.stringify(o).replace(/</g, '\\u003c')
const SLUG = /^[a-z0-9-]{1,80}$/

async function fetchExport() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`${API}/api/foundry/export`, { headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(20000) })
      if (res.ok) return await res.json()
      log(`export returned ${res.status}`)
      if (res.status === 404) return null
    } catch (e) {
      log(`export failed (attempt ${attempt}):`, e.message)
    }
  }
  return null
}

/** The partner.html shell (head, header, footer) with our own head and main. */
function page({ title, description, canonical, robots, main, script, extraHead = '' }) {
  const headEnd = TEMPLATE.indexOf('</head>')
  const mainStart = TEMPLATE.indexOf('<main')
  const mainEnd = TEMPLATE.indexOf('</main>') + '</main>'.length
  const scriptsStart = TEMPLATE.indexOf('<script src="/foundry/foundry.js">')
  let head = TEMPLATE.slice(0, headEnd)
    .replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(description)}">`)
  head += `<link rel="canonical" href="${attr(canonical)}">\n` +
    `<meta property="og:type" content="website">\n<meta property="og:title" content="${attr(title)}">\n` +
    `<meta property="og:description" content="${attr(description)}">\n<meta property="og:url" content="${attr(canonical)}">\n` + extraHead
  const shell = TEMPLATE.slice(headEnd, mainStart)
  const footer = TEMPLATE.slice(mainEnd, scriptsStart)
  return `${head}${shell}<main class="wrap">${main}</main>${footer}` +
    `<script src="/foundry/foundry.js"></script>\n<script>\n${script}\n</script>\n</body>\n</html>\n`
}

function partnerPage(p, mode) {
  const cat = R.catLabel(p.category)
  const url = `${SITE}${R.href(p.slug)}`
  const title = `${p.name}: ${cat} for franchisees · The Foundry`
  const description = [p.tagline, p.offer_text ? `Member deal: ${p.offer_text}.` : null, 'Vetted by Franchise Foundry. Free for franchisees.']
    .filter(Boolean).join(' ').slice(0, 300)
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'The Foundry', item: `${SITE}/foundry/` },
      { '@type': 'ListItem', position: 2, name: 'Partners', item: `${SITE}/foundry/partners/` },
      { '@type': 'ListItem', position: 3, name: p.name, item: url },
    ],
  }
  const data = { id: p.id, slug: p.slug, name: p.name, category: p.category, offer_text: p.offer_text || null }
  return page({
    title, description, canonical: url, robots: mode === 'live' ? 'index, follow' : 'noindex, nofollow',
    extraHead: `<script type="application/ld+json">${json(crumbs)}</script>\n`,
    main: `<div id="profile">${R.profile(p)}</div>`,
    script: `(function () {\n  var p = ${json(data)}\n  Foundry.gate().then(function (ok) { if (ok) Foundry.bindProfile(p) })\n})()`,
  })
}

function browsePage(partners, mode) {
  return page({
    title: 'Vetted partners for franchisees · The Foundry',
    description: 'Every Franchise Foundry partner: funding, legal, accounting, property, insurance and more. Vetted by us, free for franchisees, with member deals.',
    canonical: `${SITE}/foundry/partners/`,
    robots: mode === 'live' ? 'index, follow' : 'noindex, nofollow',
    main: R.browse(partners),
    script: '(function () { Foundry.gate() })()',
  })
}

function openUpForLaunch(partners) {
  // robots.txt: drop the pre-launch block on /foundry/ (search, track and verify stay noindex per page).
  const robotsPath = join(ROOT, 'robots.txt')
  if (existsSync(robotsPath)) writeFileSync(robotsPath, readFileSync(robotsPath, 'utf8').replace(/^#.*private preview.*$\n?/m, '').replace(/^Disallow:\s*\/foundry\/\s*$\n?/m, ''))
  // The Search and Become a partner pages become indexable.
  for (const f of ['index.html', 'apply.html']) {
    const p = join(ROOT, 'foundry', f)
    if (existsSync(p)) writeFileSync(p, readFileSync(p, 'utf8').replace('<meta name="robots" content="noindex, nofollow">', '<meta name="robots" content="index, follow">'))
  }
  // sitemap.xml: add The Foundry's public pages.
  const smPath = join(ROOT, 'sitemap.xml')
  if (!existsSync(smPath)) return
  const today = new Date().toISOString().slice(0, 10)
  const urls = ['/foundry/', '/foundry/partners/', '/foundry/apply.html', ...partners.map(p => R.href(p.slug))]
  const entries = urls.map(u => `  <url><loc>${attr(SITE + u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')
  const sm = readFileSync(smPath, 'utf8')
  if (!sm.includes('/foundry/partners/')) writeFileSync(smPath, sm.replace('</urlset>', `${entries}\n</urlset>`))
}

async function main() {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  let mode = 'off', partners = []
  if (!TOKEN) log('FOUNDRY_BUILD_TOKEN not set: skipping pre-built pages (they render live).')
  else {
    const data = await fetchExport()
    if (data && Array.isArray(data.partners)) { mode = data.mode; partners = data.partners.filter(p => p && SLUG.test(p.slug || '')) }
    else log('No export: pages render live until the next build.')
  }
  for (const p of partners) {
    mkdirSync(join(OUT, p.slug), { recursive: true })
    writeFileSync(join(OUT, p.slug, 'index.html'), partnerPage(p, mode))
  }
  writeFileSync(join(OUT, 'index.html'), browsePage(partners, mode))
  if (mode === 'live') openUpForLaunch(partners)
  log(`mode ${mode}: wrote ${partners.length} partner page(s) and Browse.`)
}

main().catch(e => { console.error('[build-foundry] unexpected error, continuing without pre-built pages:', e) })
