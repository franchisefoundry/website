'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { eventsForRole, shouldEmail } from '@/lib/notification-events'
import { toast } from '@/lib/toast'

interface Props {
  role: string
  initialPrefs: Record<string, boolean> | null
}

export default function NotificationSettingsCard({ role, initialPrefs }: Props) {
  const events = eventsForRole(role)

  // Resolve the effective on/off state for each event (saved pref or registry default)
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const resolved: Record<string, boolean> = {}
    for (const e of events) resolved[e.key] = shouldEmail(initialPrefs, e.key)
    return resolved
  })
  const [saving, setSaving] = useState(false)

  if (events.length === 0) return null

  async function toggle(key: string) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)
    const res = await fetch('/api/account/notification-prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefs: next }),
    })
    setSaving(false)
    if (!res.ok) {
      setPrefs(prefs) // revert
      toast('Could not save — please try again', 'error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email notifications</CardTitle>
      </CardHeader>
      <CardBody className="p-0">
        <p className="px-6 pt-4 pb-2 text-xs text-slate-500">
          Choose which updates email you. In-app notifications always appear in the bell.
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
                  aria-label={`Email me when: ${event.label}`}
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
