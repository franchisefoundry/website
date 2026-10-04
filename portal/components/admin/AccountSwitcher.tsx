'use client'

import { useState, useEffect } from 'react'

interface Account { id: string; role: string; name: string; email: string | null }

const ROLE: Record<string, { label: string; cls: string }> = {
  admin:      { label: 'Admin',      cls: 'bg-ff-green-soft text-ff-green' },
  franchisor: { label: 'Brand',      cls: 'bg-amber-100 text-amber-800' },
  franchisee: { label: 'Franchisee', cls: 'bg-blue-100 text-blue-700' },
  introducer: { label: 'Agent',      cls: 'bg-violet-100 text-violet-700' },
}

function Tag({ role }: { role: string }) {
  const r = ROLE[role] ?? { label: role, cls: 'bg-surface-2 text-ink-2' }
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${r.cls}`}>{r.label}</span>
}

function initials(name: string) {
  return name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function AccountSwitcher({ currentName }: { currentName: string }) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (open && accounts === null) {
      fetch('/api/admin/accounts').then(r => r.json()).then(d => setAccounts(d.accounts ?? [])).catch(() => setAccounts([]))
    }
  }, [open, accounts])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function jump(a: Account) {
    setBusy(a.id)
    const redirectTo = `${window.location.origin}/${a.role}`
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: a.id, redirectTo }),
      })
      const d = await res.json()
      if (d.link) window.open(d.link, '_blank', 'noopener,noreferrer')
      else alert(d.error ?? 'Could not switch account')
    } catch { alert('Switch request failed') }
    setBusy(null)
  }

  const filtered = (accounts ?? []).filter(a =>
    a.name.toLowerCase().includes(q.toLowerCase()) || (a.email ?? '').toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white hover:bg-surface/10 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" />
        </svg>
        Switch account
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4 bg-ink/40"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl overflow-hidden border border-line">
            <div className="px-4 py-3 border-b border-line-2">
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search accounts…"
                className="w-full text-sm bg-transparent outline-none text-ink placeholder:text-ink-3" />
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-1.5">
              {/* Current admin */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-ff-green/[0.06]">
                <div className="w-8 h-8 rounded-full bg-ff-green/15 text-ff-green flex items-center justify-center text-xs font-bold">{initials(currentName)}</div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink truncate">{currentName} <span className="text-ink-3 font-normal">(you)</span></p></div>
                <Tag role="admin" />
              </div>

              {accounts === null ? (
                <p className="px-3 py-8 text-center text-sm text-ink-3">Loading accounts…</p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink-3">No accounts found.</p>
              ) : filtered.map(a => (
                <button key={a.id} onClick={() => jump(a)} disabled={busy === a.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors text-left disabled:opacity-60">
                  <div className="w-8 h-8 rounded-full bg-surface-2 border border-line-2 text-ink-2 flex items-center justify-center text-xs font-bold">{initials(a.name)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{a.name}</p>
                    {a.email && <p className="text-xs text-ink-3 truncate">{a.email}</p>}
                  </div>
                  <Tag role={a.role} />
                  <span className="text-xs text-ink-3">{busy === a.id ? '…' : '↗'}</span>
                </button>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-line-2 bg-surface-2">
              <p className="text-[11px] text-ink-3">Opens the account in a new tab. Your admin session stays here.</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
