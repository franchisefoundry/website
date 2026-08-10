'use client'

import { useEffect, useState } from 'react'

/**
 * A dismissible "install this app" banner.
 *
 * - Android / desktop Chrome: uses the native `beforeinstallprompt` event so a
 *   tap fires the real OS install dialog.
 * - iOS Safari: there is no install API, so we show the manual
 *   "Share → Add to Home Screen" instructions (required before push works on iOS).
 *
 * Hidden entirely when the app is already running installed (standalone), and
 * stays dismissed for 30 days via localStorage.
 */

const DISMISS_KEY = 'ff_install_dismissed_at'
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<any> }

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag when launched from home screen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [showIos, setShowIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return

    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    // iOS never fires beforeinstallprompt — show manual guidance instead.
    if (isIos()) setShowIos(true)

    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDeferred(null)
    setShowIos(false)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice.catch(() => {})
    dismiss()
  }

  if (!deferred && !showIos) return null

  return (
    <div
      role="dialog"
      aria-label="Install the Franchise Foundry app"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 60,
        margin: '0 auto',
        maxWidth: 420,
        background: '#3a4a3a',
        color: '#fff',
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
        fontFamily: 'Sora, system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4 }}>
          <strong style={{ display: 'block', marginBottom: 2 }}>Install the FF Portal</strong>
          {deferred ? (
            <span style={{ opacity: 0.9 }}>Add it to your home screen for one-tap access and alerts.</span>
          ) : (
            <span style={{ opacity: 0.9 }}>
              Tap the Share icon, then <strong>Add to Home Screen</strong> to install and enable notifications.
            </span>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      {deferred && (
        <button
          onClick={install}
          style={{
            marginTop: 10,
            width: '100%',
            background: '#d4a574',
            color: '#2a352a',
            border: 'none',
            borderRadius: 10,
            padding: '10px 14px',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Install app
        </button>
      )}
    </div>
  )
}
