'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Persistent "Install app" section for the profile page. Always visible (unlike
 * the dismissible banner) and always offers a path to install:
 *  - installed   → confirms it's already on this device
 *  - installable → a real Install button (uses the captured browser prompt)
 *  - ios         → Share → Add to Home Screen steps (iOS has no install API)
 *  - manual      → Android/desktop Chrome menu steps, shown when the browser
 *                  isn't currently offering the automatic prompt (e.g. shortly
 *                  after uninstalling, when Chrome suppresses it)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Deferred = Event & { prompt: () => Promise<void>; userChoice: Promise<any> }
type State = 'loading' | 'installed' | 'installable' | 'ios' | 'manual'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  )
}
function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export default function InstallAppCard() {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const resolve = () => {
      if (isStandalone()) return setState('installed')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).__ffInstallPrompt) return setState('installable')
      if (isIos()) return setState('ios')
      return setState('manual')
    }
    resolve()

    const onInstallable = () => resolve()
    const onInstalled = () => setState('installed')
    window.addEventListener('ff:installable', onInstallable)
    window.addEventListener('ff:appinstalled', onInstalled)
    return () => {
      window.removeEventListener('ff:installable', onInstallable)
      window.removeEventListener('ff:appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deferred = (window as any).__ffInstallPrompt as Deferred | undefined
    if (!deferred) return
    setBusy(true)
    try {
      await deferred.prompt()
      await deferred.userChoice.catch(() => {})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).__ffInstallPrompt = null
    } finally {
      setBusy(false)
    }
  }

  const stepClass = 'text-sm text-ink-2 leading-relaxed'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install the app</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {state === 'loading' && <p className={stepClass}>Checking…</p>}

        {state === 'installed' && (
          <p className={stepClass}>
            ✅ Franchise Foundry is installed on this device. Open it from your home screen.
          </p>
        )}

        {state === 'installable' && (
          <>
            <p className={stepClass}>
              Add Franchise Foundry to your home screen for one-tap access and push notifications.
            </p>
            <button
              type="button"
              onClick={install}
              disabled={busy}
              className="rounded-lg bg-ff-green px-4 py-2 text-sm font-medium text-white hover:bg-ff-green-deep disabled:opacity-60"
            >
              {busy ? 'Installing…' : 'Install app'}
            </button>
          </>
        )}

        {state === 'ios' && (
          <>
            <p className={stepClass}>To install on your iPhone or iPad:</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-ink-2">
              <li>Tap the <strong>Share</strong> icon in Safari (the square with an up-arrow).</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>. Open “Franchise Foundry” from your home screen, then enable notifications in your profile.</li>
            </ol>
            <p className="text-xs text-ink-3">Note: on iPhone, push notifications only work once the app is added to the home screen.</p>
          </>
        )}

        {state === 'manual' && (
          <>
            <p className={stepClass}>To install Franchise Foundry on this device:</p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-ink-2">
              <li>Open the browser menu — the <strong>⋮</strong> icon (Android Chrome) or the install icon in the address bar (desktop).</li>
              <li>Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).</li>
              <li>Confirm. Then open “Franchise Foundry” and enable notifications in your profile.</li>
            </ol>
            <p className="text-xs text-ink-3">
              Just uninstalled it? The one-tap install button can take a little while to reappear —
              the menu steps above always work in the meantime.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  )
}
