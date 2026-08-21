'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DashboardIcon, LeadsIcon, FranchiseeIcon, FranchisorIcon, MatchIcon,
  AgreementIcon, MarketplaceIcon, AgentIcon, QuestionnaireIcon, PlusIcon, SearchIcon,
} from '@/components/icons'

type Cmd = {
  id: string
  label: string
  href: string
  group: 'Go to' | 'Actions'
  icon: React.ReactNode
  keywords?: string
}

function commandsFor(role: string): Cmd[] {
  const i = (n: React.ReactNode) => n
  if (role === 'admin') return [
    { id: 'dash', label: 'Dashboard', href: '/admin', group: 'Go to', icon: i(<DashboardIcon className="w-4 h-4" />) },
    { id: 'leads', label: 'Leads', href: '/admin/leads', group: 'Go to', icon: i(<LeadsIcon className="w-4 h-4" />), keywords: 'crm prospects' },
    { id: 'franchisees', label: 'Franchisees', href: '/admin/franchisees', group: 'Go to', icon: i(<FranchiseeIcon className="w-4 h-4" />) },
    { id: 'franchisors', label: 'Franchisors', href: '/admin/franchisors', group: 'Go to', icon: i(<FranchisorIcon className="w-4 h-4" />), keywords: 'brands' },
    { id: 'matches', label: 'Matches', href: '/admin/matches', group: 'Go to', icon: i(<MatchIcon className="w-4 h-4" />) },
    { id: 'agreements', label: 'Agreements', href: '/admin/agreements', group: 'Go to', icon: i(<AgreementIcon className="w-4 h-4" />) },
    { id: 'agents', label: 'Agents', href: '/admin/introducers', group: 'Go to', icon: i(<AgentIcon className="w-4 h-4" />), keywords: 'introducers referral' },
    { id: 'partners', label: 'Marketplace partners', href: '/admin/partners', group: 'Go to', icon: i(<MarketplaceIcon className="w-4 h-4" />) },
    { id: 'questionnaires', label: 'Questionnaires', href: '/admin/questionnaires', group: 'Go to', icon: i(<QuestionnaireIcon className="w-4 h-4" />) },
    { id: 'inv-fr', label: 'Invite a franchisor', href: '/admin/franchisors/invites', group: 'Actions', icon: i(<PlusIcon className="w-4 h-4" />), keywords: 'add brand new' },
    { id: 'inv-fe', label: 'Invite a franchisee', href: '/admin/franchisees/invites', group: 'Actions', icon: i(<PlusIcon className="w-4 h-4" />) },
    { id: 'inv-ag', label: 'Invite an agent', href: '/admin/introducers/invites', group: 'Actions', icon: i(<PlusIcon className="w-4 h-4" />) },
    { id: 'run-match', label: 'Run matching', href: '/admin/matches', group: 'Actions', icon: i(<MatchIcon className="w-4 h-4" />), keywords: 'score' },
  ]
  if (role === 'franchisor') return [
    { id: 'dash', label: 'Dashboard', href: '/franchisor', group: 'Go to', icon: i(<DashboardIcon className="w-4 h-4" />) },
    { id: 'candidates', label: 'Candidates', href: '/franchisor/matches', group: 'Go to', icon: i(<LeadsIcon className="w-4 h-4" />) },
    { id: 'profile', label: 'Brand profile', href: '/franchisor/brand-profile', group: 'Go to', icon: i(<FranchisorIcon className="w-4 h-4" />) },
    { id: 'quest', label: 'Questionnaire', href: '/franchisor/questionnaire', group: 'Go to', icon: i(<QuestionnaireIcon className="w-4 h-4" />) },
    { id: 'agreement', label: 'Agreement', href: '/franchisor/agreement', group: 'Go to', icon: i(<AgreementIcon className="w-4 h-4" />) },
    { id: 'market', label: 'Marketplace', href: '/franchisor/marketplace', group: 'Go to', icon: i(<MarketplaceIcon className="w-4 h-4" />) },
    { id: 'account', label: 'My account', href: '/franchisor/profile', group: 'Go to', icon: i(<FranchiseeIcon className="w-4 h-4" />) },
  ]
  if (role === 'introducer') return [
    { id: 'dash', label: 'Dashboard', href: '/introducer', group: 'Go to', icon: i(<DashboardIcon className="w-4 h-4" />) },
    { id: 'leads', label: 'My leads', href: '/introducer/leads', group: 'Go to', icon: i(<LeadsIcon className="w-4 h-4" />) },
    { id: 'commission', label: 'Commission', href: '/introducer/commission', group: 'Go to', icon: i(<MatchIcon className="w-4 h-4" />) },
    { id: 'account', label: 'My account & referral link', href: '/introducer/profile', group: 'Go to', icon: i(<AgentIcon className="w-4 h-4" />), keywords: 'referral link share' },
  ]
  // franchisee
  return [
    { id: 'dash', label: 'Dashboard', href: '/franchisee', group: 'Go to', icon: i(<DashboardIcon className="w-4 h-4" />) },
    { id: 'journey', label: 'My journey', href: '/franchisee/matches', group: 'Go to', icon: i(<MatchIcon className="w-4 h-4" />), keywords: 'matches' },
    { id: 'market', label: 'Marketplace', href: '/franchisee/marketplace', group: 'Go to', icon: i(<MarketplaceIcon className="w-4 h-4" />) },
    { id: 'profile', label: 'My profile', href: '/franchisee/profile', group: 'Go to', icon: i(<FranchiseeIcon className="w-4 h-4" />) },
  ]
}

export function CommandPalette({ role }: { role: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo(() => commandsFor(role), [role])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) || (c.keywords ?? '').toLowerCase().includes(q)
    )
  }, [query, commands])

  // Reset highlight when the result set changes
  useEffect(() => { setActive(0) }, [query, open])

  const run = useCallback((cmd?: Cmd) => {
    const target = cmd ?? results[active]
    if (!target) return
    setOpen(false)
    router.push(target.href)
  }, [results, active, router])

  // Global ⌘K / Ctrl+K, plus a custom event so a button can open it too
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    function onOpen() { setOpen(true) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('ff:cmdk', onOpen as EventListener)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('ff:cmdk', onOpen as EventListener)
    }
  }, [])

  // Focus + scroll lock while open
  useEffect(() => {
    if (!open) { setQuery('') ; return }
    const t = setTimeout(() => inputRef.current?.focus(), 20)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(t); document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  // group results in display order
  const groups: { name: string; items: Cmd[] }[] = []
  for (const c of results) {
    let g = groups.find(x => x.name === c.group)
    if (!g) { g = { name: c.group, items: [] }; groups.push(g) }
    g.items.push(c)
  }
  // flat index for keyboard nav mapping
  const flat = groups.flatMap(g => g.items)

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center px-4 pt-[14vh] bg-black/45 backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
      onKeyDown={e => {
        if (e.key === 'Escape') setOpen(false)
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
        if (e.key === 'Enter') { e.preventDefault(); run() }
      }}
    >
      <div
        className="w-full max-w-[600px] rounded-2xl shadow-2xl border overflow-hidden"
        style={{ background: 'var(--ff-surface)', borderColor: 'var(--ff-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--ff-border-2)' }}>
          <SearchIcon className="w-[18px] h-[18px] text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or jump to…"
            className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-slate-400"
          />
          <kbd className="text-[11px] px-1.5 py-0.5 rounded border text-slate-400" style={{ borderColor: 'var(--ff-border)', background: 'var(--ff-surface-2)' }}>esc</kbd>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {flat.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-slate-400">No matches for “{query}”.</div>
          )}
          {groups.map(group => (
            <div key={group.name}>
              <div className="px-3 pt-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{group.name}</div>
              {group.items.map(cmd => {
                const idx = flat.indexOf(cmd)
                const isActive = idx === active
                return (
                  <button
                    key={cmd.id}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => run(cmd)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors"
                    style={isActive ? { background: 'var(--ff-gold-soft)' } : undefined}
                  >
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-500" style={{ background: 'var(--ff-surface-2)' }}>
                      {cmd.icon}
                    </span>
                    <span className="flex-1 text-[13.5px] font-medium text-ink">{cmd.label}</span>
                    {isActive && <span className="text-[11px] font-semibold" style={{ color: 'var(--ff-gold-ink)' }}>↵</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t text-[11px] text-slate-400" style={{ borderColor: 'var(--ff-border-2)', background: 'var(--ff-surface-2)' }}>
          <span>↑↓ navigate</span><span>↵ open</span>
          <span className="ml-auto flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--ff-border)', background: 'var(--ff-surface)' }}>⌘K</kbd> anywhere</span>
        </div>
      </div>
    </div>
  )
}
