// Build step: turn CMS markdown articles into real static HTML pages and inject
// their cards into blog.html. Additive — never touches the existing hand-written
// articles or any other page. Runs at Netlify build time.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

const ROOT = process.cwd()
const ARTICLES_SRC = join(ROOT, 'content', 'articles')
const TEMPLATE = join(ROOT, 'content', 'article-template.html')
const OUT_DIR = join(ROOT, 'articles')
const BLOG = join(ROOT, 'blog.html')

const CATEGORY_CLASS = {
  'Industry Insight': 'cat-industry',
  'Franchise Advice': 'cat-advice',
  'Market Analysis': 'cat-industry',
  'Guides': 'cat-advice',
}

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length
  return `${Math.max(1, Math.round(words / 200))} min read`
}

function formatDate(d) {
  const date = d ? new Date(d) : new Date()
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

if (!existsSync(ARTICLES_SRC)) {
  console.log('[build-articles] no content/articles dir — nothing to build.')
  process.exit(0)
}

const template = readFileSync(TEMPLATE, 'utf8')
const files = readdirSync(ARTICLES_SRC).filter(f => f.endsWith('.md'))

const built = []

for (const file of files) {
  const raw = readFileSync(join(ARTICLES_SRC, file), 'utf8')
  const { data, content } = matter(raw)

  // Drafts (e.g. freshly imported from PDF) stay in the CMS but off the live site
  if (data.draft) {
    console.log(`[build-articles] skipped draft: ${file}`)
    continue
  }

  const slug = (data.slug || file.replace(/\.md$/, '')).toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const title = data.title || 'Untitled'
  const description = data.description || data.excerpt || ''
  const category = data.category || 'Industry Insight'
  const author = data.author || 'Franchise Foundry'
  const date = data.date || new Date().toISOString()
  const bodyHtml = marked.parse(content)
  const readTime = data.readTime || estimateReadTime(content)
  const ogImage = data.coverImage
    ? (data.coverImage.startsWith('http') ? data.coverImage : `https://franchisefoundry.co.uk${data.coverImage}`)
    : 'https://franchisefoundry.co.uk/images/copy-of-franchise-foundry-logo-final-2.png'

  const html = template
    .replaceAll('{{TITLE}}', esc(title))
    .replaceAll('{{DESCRIPTION}}', esc(description))
    .replaceAll('{{OG_IMAGE}}', esc(ogImage))
    .replaceAll('{{SLUG}}', slug)
    .replaceAll('{{CATEGORY}}', esc(category))
    .replaceAll('{{HEADING}}', esc(title))
    .replaceAll('{{AUTHOR}}', esc(author))
    .replaceAll('{{DATE}}', esc(formatDate(date)))
    .replaceAll('{{READ_TIME}}', esc(readTime))
    .replace('{{BODY}}', bodyHtml)

  writeFileSync(join(OUT_DIR, `${slug}.html`), html)
  built.push({ slug, title, description, category, date, readTime, excerpt: data.excerpt || description })
  console.log(`[build-articles] built articles/${slug}.html`)
}

// Sort newest first. The newest article becomes the featured headline; the
// rest fill the grid. Both regions are driven entirely from the CMS, so
// publishing a newer article in Sveltia automatically promotes it to the top.
built.sort((a, b) => new Date(b.date) - new Date(a.date))

const featured = built[0] || null
const rest = built.slice(1)

const cards = rest.map(a => {
  const catClass = CATEGORY_CLASS[a.category] || 'cat-industry'
  return `                <article class="article-card reveal">
                    <span class="article-category ${catClass}">${esc(a.category)}</span>
                    <h2 class="article-title">${esc(a.title)}</h2>
                    <p class="article-excerpt">${esc(a.excerpt)}</p>
                    <div class="article-footer">
                        <span class="article-meta">${esc(formatDate(a.date))} &nbsp;·&nbsp; ${esc(a.readTime)}</span>
                        <a href="articles/${a.slug}.html" class="article-link">Read article <span>&rarr;</span></a>
                    </div>
                </article>`
}).join('\n\n')

const featuredHtml = featured ? `                <article class="featured-article reveal">
                    <div class="featured-article-left">
                        <div class="featured-label"><span class="featured-label-dot"></span> Featured Article</div>
                        <span class="featured-category">${esc(featured.category)}</span>
                        <h2>${esc(featured.title)}</h2>
                    </div>
                    <div class="featured-article-right">
                        <p>${esc(featured.excerpt)}</p>
                        <div class="featured-article-footer">
                            <span class="featured-meta">${esc(formatDate(featured.date))} &nbsp;·&nbsp; ${esc(featured.readTime)}</span>
                            <a href="articles/${featured.slug}.html" class="btn-green">Read article &rarr;</a>
                        </div>
                    </div>
                </article>` : ''

// Replace the content between a START/END marker pair, preserving indentation.
function injectBetween(html, startMarker, endMarker, inner) {
  if (!html.includes(startMarker) || !html.includes(endMarker)) {
    console.warn(`[build-articles] markers ${startMarker} not found — skipped.`)
    return { html, ok: false }
  }
  const before = html.slice(0, html.indexOf(startMarker) + startMarker.length)
  const after = html.slice(html.indexOf(endMarker))
  return { html: `${before}\n${inner ? inner + '\n\n                ' : '                '}${after}`, ok: true }
}

let blog = readFileSync(BLOG, 'utf8')

// Featured headline (newest article) — only replace if there is one to show,
// so an empty CMS never wipes a hand-written fallback headline.
if (featured) {
  const res = injectBetween(blog, '<!-- CMS-FEATURED:START -->', '<!-- CMS-FEATURED:END -->', featuredHtml)
  blog = res.html
  if (res.ok) console.log(`[build-articles] featured: ${featured.slug}`)
}

// Remaining articles → grid cards
{
  const res = injectBetween(blog, '<!-- CMS-ARTICLES:START -->', '<!-- CMS-ARTICLES:END -->', cards)
  blog = res.html
  if (res.ok) console.log(`[build-articles] injected ${rest.length} card(s) into blog.html`)
}

writeFileSync(BLOG, blog)

console.log(`[build-articles] done — ${built.length} article(s) (1 featured, ${rest.length} in grid).`)
