'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker once, on the client, after load.
 * Kept deliberately tiny — push subscription is handled separately on the
 * notification-settings page, only after the user opts in.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.error('[sw] registration failed', err))
    }

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
