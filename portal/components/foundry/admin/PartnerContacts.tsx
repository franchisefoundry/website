'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

export interface Contact { id: string; name: string; email: string | null; phone: string | null; role: string | null; is_primary: boolean }

/** "Who we brief" at a partner. Admin only. */
export function PartnerContacts({ partnerId, initial, onChange, compact = false }: {
  partnerId: string
  initial?: Contact[]
  onChange?: (contacts: Contact[]) => void
  compact?: boolean
}) {
  const [contacts, setContacts] = useState<Contact[]>(initial ?? [])
  const [loaded, setLoaded] = useState(!!initial)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial) return
    fetch(`/api/admin/partners/${partnerId}/contacts`).then(r => r.ok ? r.json() : []).then(d => { setContacts(d); setLoaded(true) })
  }, [partnerId, initial])

  function update(next: Contact[]) { setContacts(next); onChange?.(next) }

  async function add() {
    setSaving(true)
    const res = await fetch(`/api/admin/partners/${partnerId}/contacts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => null)
    setSaving(false)
    if (!res.ok) { toast(data?.error ?? 'Could not save.', 'error'); return }
    update([...contacts, data])
    setForm({ name: '', email: '', phone: '', role: '' }); setAdding(false)
  }

  async function makePrimary(id: string) {
    const res = await fetch(`/api/admin/partner-contacts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_primary: true }) })
    if (res.ok) update(contacts.map(c => ({ ...c, is_primary: c.id === id })).sort((a, b) => Number(b.is_primary) - Number(a.is_primary)))
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/partner-contacts/${id}`, { method: 'DELETE' })
    if (res.ok) update(contacts.filter(c => c.id !== id))
  }

  const input = 'w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ff-green'

  return (
    <div className={cn(!compact && 'rounded-xl border border-line p-4')}>
      {!compact && (
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-2">Who we brief <span className="font-normal normal-case text-ink-3">(private, never shown publicly)</span></span>
        </div>
      )}
      {!loaded ? <p className="text-xs text-ink-3">Loading…</p> : (
        <ul className="space-y-1.5">
          {contacts.map(c => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-ink">{c.name}</span>{c.role && <span className="text-ink-3"> · {c.role}</span>}
                <span className="block truncate text-xs text-ink-2">{[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details'}</span>
              </span>
              {c.is_primary
                ? <span className="rounded-full bg-ff-green px-2 py-0.5 text-[10px] font-bold text-white">Primary</span>
                : <button type="button" onClick={() => makePrimary(c.id)} className="text-xs text-ff-green hover:underline">Make primary</button>}
              <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`} className="text-xs text-ink-3 hover:text-red-600">Remove</button>
            </li>
          ))}
          {contacts.length === 0 && <li className="text-xs text-ink-3">No one yet. Add who we should brief.</li>}
        </ul>
      )}
      {adding ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-ink-2">Name<input className={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
          <label className="text-xs text-ink-2">Role<input className={input} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Franchise lending" /></label>
          <label className="text-xs text-ink-2">Email<input type="email" className={input} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
          <label className="text-xs text-ink-2">Phone<input className={input} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" onClick={add} disabled={saving || !form.name.trim()} className="min-h-[36px] rounded-lg bg-ff-green px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save contact'}</button>
            <button type="button" onClick={() => setAdding(false)} className="min-h-[36px] px-3 text-sm text-ink-2">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-2 text-xs font-semibold text-ff-green hover:underline">+ Add contact</button>
      )}
    </div>
  )
}
