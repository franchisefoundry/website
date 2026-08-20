// ─────────────────────────────────────────────────────────────────────────────
// Import Article from PDF
// POST /.netlify/functions/import-article  { pdf_base64 }
//
// 1. Extract the PDF text
// 2. Ask Claude to structure it into title / category / excerpt / markdown body
// 3. Commit it as a DRAFT article (.md) to content/articles/ so it appears in the
//    CMS for tweaking, but stays off the live site until the draft box is unticked.
//
// Requires env vars: ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPO (owner/repo).
// Optional: ANTHROPIC_MODEL (defaults below), GITHUB_BRANCH (defaults to main).
// ─────────────────────────────────────────────────────────────────────────────
import { extractText, getDocumentProxy } from 'unpdf'

const CATEGORIES = ['Industry Insight', 'Franchise Advice', 'Market Analysis', 'Guides']
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }
}

function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled'
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const env = process.env
  if (!env.ANTHROPIC_API_KEY) return json(500, { error: 'ANTHROPIC_API_KEY is not configured.' })
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return json(500, { error: 'GitHub access is not configured.' })

  // Access-key gate (Sveltia uses GitHub OAuth, so there's no Netlify Identity to
  // reuse here). The key is a shared secret set as IMPORT_PASSWORD in Netlify.
  const key = event.headers['x-import-key'] || event.headers['X-Import-Key']
  if (!env.IMPORT_PASSWORD || key !== env.IMPORT_PASSWORD) {
    return json(401, { error: 'Incorrect or missing access key.' })
  }

  let payload
  try { payload = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Invalid request.' }) }
  if (!payload.pdf_base64) return json(400, { error: 'No PDF was provided.' })

  // ── 1. Extract text ────────────────────────────────────────────────────────
  let text
  try {
    const bytes = new Uint8Array(Buffer.from(payload.pdf_base64, 'base64'))
    const pdf = await getDocumentProxy(bytes)
    const res = await extractText(pdf, { mergePages: true })
    text = (Array.isArray(res.text) ? res.text.join('\n') : res.text || '').trim()
  } catch {
    return json(422, { error: 'Could not read text from that PDF.' })
  }
  if (text.length < 120) {
    return json(422, { error: 'The PDF had almost no selectable text — it may be a scan or image. Try a text-based PDF.' })
  }

  // ── 2. Structure with Claude ─────────────────────────────────────────────────
  let article
  try {
    article = await structure(text.slice(0, 24000), env)
  } catch (e) {
    return json(502, { error: `AI structuring failed: ${e.message}` })
  }

  // ── 3. Commit as a draft ─────────────────────────────────────────────────────
  const md = [
    '---',
    `title: ${JSON.stringify(article.title)}`,
    `category: ${JSON.stringify(CATEGORIES.includes(article.category) ? article.category : 'Industry Insight')}`,
    'author: "Franchise Foundry"',
    `date: ${new Date().toISOString()}`,
    `excerpt: ${JSON.stringify(article.excerpt || '')}`,
    'status: "Draft"',
    'featured: false',
    '---',
    '',
    article.body || '',
    '',
  ].join('\n')

  try {
    const path = await commit(env, slugify(article.title), md, article.title)
    return json(200, { success: true, path, title: article.title, category: article.category })
  } catch (e) {
    return json(502, { error: `Could not save the draft: ${e.message}` })
  }
}

async function structure(text, env) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are preparing a blog article for Franchise Foundry, a UK franchise matching service that works for the buyer, not the brand. Below is the raw text extracted from a PDF. Turn it into a publishable article.

Return ONLY a JSON object (no prose, no code fences) with exactly these keys:
- "title": a clear, SEO-friendly headline (max ~70 chars)
- "category": one of exactly ${JSON.stringify(CATEGORIES)}
- "excerpt": a punchy 1–2 sentence summary for the blog card and meta description (max ~200 chars)
- "body": the full article in clean Markdown — use ## for section headings, short paragraphs, and bullet lists where helpful. Do not include the title as a heading (it is shown separately). Keep the tone informative and straight-talking. British English.

Raw PDF text:
"""
${text}
"""`,
      }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  let out = (data.content?.[0]?.text || '').trim()
  out = out.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') // strip fences if any
  const parsed = JSON.parse(out)
  if (!parsed.title || !parsed.body) throw new Error('AI returned an unexpected shape.')
  return parsed
}

async function commit(env, baseSlug, content, title) {
  const repo = env.GITHUB_REPO
  const branch = env.GITHUB_BRANCH || 'main'
  const b64 = Buffer.from(content, 'utf8').toString('base64')

  // Avoid clobbering an existing file — suffix the slug if taken
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Date.now().toString(36).slice(-4)}`
    const path = `content/articles/${slug}.md`
    const url = `https://api.github.com/repos/${repo}/contents/${path}`

    // Does it already exist?
    const check = await fetch(`${url}?ref=${branch}`, { headers: ghHeaders(env) })
    if (check.status === 200) continue // taken — try a suffixed slug

    const put = await fetch(url, {
      method: 'PUT',
      headers: ghHeaders(env),
      body: JSON.stringify({
        message: `Draft article from PDF: ${title}`,
        content: b64,
        branch,
      }),
    })
    if (put.ok) return path
    if (put.status !== 422) {
      const detail = await put.text()
      throw new Error(`GitHub ${put.status}: ${detail.slice(0, 200)}`)
    }
  }
  throw new Error('Could not find a free filename.')
}

function ghHeaders(env) {
  return {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'franchise-foundry-importer',
  }
}
