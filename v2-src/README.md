# Website v2 (preview)

Built from the "Franchise Foundry: Website v2" design canvas. Lives at `/v2/` alongside the current site, which is untouched.

- `v2-src/pages/<route>.html`: page bodies. Each starts with a `<!--meta {...} -->` comment (title, description, active nav item, optional `layout: "app"` and `scripts`).
- `build-v2.mjs`: wraps each page in the shared head, header and footer and writes `v2/<route>/index.html`. Runs as part of `npm run build` on every deploy, or alone with `npm run build:v2`. Edit the source, not the generated `index.html`.
- `v2/assets/`: `v2.css` (the design system), `v2.js` (header, FAQ, filters, toggles), `match.js`, `results.js`, `inbox.js`.
- Every page is `noindex`, and `/v2/` is disallowed in `robots.txt`. A dark strip on every page says it's a preview.
- Forms post to the existing Netlify forms (`contact`, `brand-enquiry`) so the notification emails keep working. `partner-apply` is new: it's stored in Netlify but `submission-created.js` doesn't email it yet.

Index of every page: `/v2/preview/`.

## Going live

1. Fill the `[bracketed]` content.
2. Move routes to their launch URLs (drop the `/v2` prefix in `build-v2.mjs` and page links), add 301s from the old `.html` pages in `_redirects`.
3. Remove `noindex`, the preview strip and the `robots.txt` lines, and add the pages to `sitemap.xml` with canonicals.
