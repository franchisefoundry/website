'use client'

import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { eventsForRole, shouldPush } from '@/lib/notification-events'
import { toast } from '@/lib/toast'

interface Props {
  role: string
  initialPushPrefs: Record<string, boolean> | null
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

/** Convert a base64url VAPID key into the ArrayBuffer the Push API expects. */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

type PushState = 'loading' | 'unsupported' | 'off' | 'on' | 'denied'

export default function PushNotificationsCard({ role, initialPushPrefs }: Props) {
  const events = eventsForRole(role)

  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const resolved: Record<string, boolean> = {}
    for (const e of events) resolved[e.key] = shouldPush(initialPushPrefs, e.key)
    return resolved
  })
  const [saving, setSaving] = useState(false)

  // Determine current device state on mount.
  useEffect(() => {
    let cancelled = false
    async function check() {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window) ||
        !VAPID_PUBLIC_KEY
      ) {
        if (!cancelled) setState('unsupported')
        return
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!cancelled) setState(sub ? 'on' : 'off')
    }
    check().catch(() => !cancelled && setState('unsupported'))
    return () => {
      cancelled = true
    }
  }, [])

  if (events.length === 0) return null

  async function enable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY!),
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error('save failed')
      setState('on')
      toast('Push notifications enabled on this device', 'success')
    } catch (err) {
      console.error('[push] enable failed', err)
      toast('Could not enable push on this device', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState('off')
      toast('Push disabled on this device', 'success')
    } catch (err) {
      console.error('[push] disable failed', err)
      toast('Could not disable push', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggle(key: string) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    const res = await fetch('/api/account/notification-prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushPrefs: next }),
    })
    setSaving(false)
    if (!res.ok) {
      setPrefs(prefs)
      toast('Could not save — please try again', 'error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push notifications</CardTitle>
      </CardHeader>
      <CardBody className="p-0">
        {/* Device enable row */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">This device</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {state === 'unsupported' && 'Not available in this browser. On iPhone, add the app to your home screen first.'}
              {state === 'denied' && 'Blocked in your browser settings — allow notifications there to enable.'}
              {state === 'off' && 'Get alerts on this device even when the portal is closed.'}
              {state === 'on' && 'Enabled — you’ll receive push alerts on this device.'}
              {state === 'loading' && 'Checking…'}
            </p>
          </div>
          {state === 'on' ? (
            <button
              type="button"
              disabled={busy}
              onClick={disable}
              className="flex-shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Disable
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || state === 'unsupported' || state === 'denied' || state === 'loading'}
              onClick={enable}
              className="flex-shrink-0 rounded-lg bg-brand-green px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-green-dark disabled:opacity-60"
            >
              {busy ? 'Enabling…' : 'Enable'}
            </button>
          )}
        </div>

        {/* Per-event toggles */}
        <p className="px-6 pt-4 pb-2 text-xs text-slate-500">
          Choose which updates push to your devices.
        </p>
        <div className="divide-y divide-slate-100">
          {events.map(event => {
            const on = prefs[event.key]
            return (
              <div key={event.key} className="flex items-center justify-between gap-4 px-6 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{event.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{event.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`Push me when: ${event.label}`}
                  disabled={saving}
                  onClick={() => toggle(event.key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1 ${
                    on ? 'bg-brand-green' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      on ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </CardBody>
    </Card>
  )
}
