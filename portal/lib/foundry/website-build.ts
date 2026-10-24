/**
 * Ask Netlify to rebuild the website so its pre-built partner pages pick up a
 * change. FOUNDRY_WEBSITE_BUILD_HOOK is the website's build hook URL; without
 * it this does nothing (pages then render live until the next deploy).
 */
export async function triggerWebsiteBuild(reason: string): Promise<void> {
  const hook = process.env.FOUNDRY_WEBSITE_BUILD_HOOK
  if (!hook || !/^https:\/\/api\.netlify\.com\/build_hooks\//.test(hook)) return
  try {
    const url = `${hook}?trigger_title=${encodeURIComponent(`Foundry: ${reason}`.slice(0, 120))}`
    const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(5000) })
    if (!res.ok) console.error('[website-build] hook returned', res.status)
  } catch (e) {
    console.error('[website-build] hook failed', e)
  }
}
