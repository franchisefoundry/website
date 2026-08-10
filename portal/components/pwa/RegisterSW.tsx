'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker and captures the browser's install prompt into a
 * window-level global so any component (the banner, the profile "Install app"
 * card) can trigger installation later — even if it mounts after the
 * `beforeinstallprompt` event fired. Lives in the root layout, which persists
 * across navigation, so the listener is never torn down mid-session.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Service worker
    if ('serviceWorker' in navigator) {
      const register = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .catch((err) => console.error('[sw] registration failed', err))
      }
      if (document.readyState === 'complete') register()
      else window.addEventListener('load', register, { once: true })
    }

    // Install prompt capture
    const onBip = (e: Event) => {
      e.preventDefault()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__ffInstallPrompt = e
      window.dispatchEvent(new Event('ff:installable'))
    }
    const onInstalled = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__ffInstallPrompt = null
      window.dispatchEvent(new Event('ff:appinstalled'))
    }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return null
}
