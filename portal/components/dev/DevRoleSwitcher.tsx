'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TEST_ACCOUNTS = [
  {
    role: 'admin',
    label: 'Admin',
    emoji: '🛡️',
    email: process.env.NEXT_PUBLIC_DEV_ADMIN_EMAIL ?? '',
    password: process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD ?? '',
    redirect: '/admin',
  },
  {
    role: 'franchisee',
    label: 'Franchisee',
    emoji: '🤝',
    email: process.env.NEXT_PUBLIC_DEV_FRANCHISEE_EMAIL ?? '',
    password: process.env.NEXT_PUBLIC_DEV_FRANCHISEE_PASSWORD ?? '',
    redirect: '/franchisee/dashboard',
  },
  {
    role: 'franchisor',
    label: 'Franchisor',
    emoji: '🏢',
    email: process.env.NEXT_PUBLIC_DEV_FRANCHISOR_EMAIL ?? '',
    password: process.env.NEXT_PUBLIC_DEV_FRANCHISOR_PASSWORD ?? '',
    redirect: '/franchisor/dashboard',
  },
]

export function DevRoleSwitcher() {
  const [open, setOpen] = useState(false)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setCurrentEmail(data.user.email ?? null)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      setCurrentRole(profile?.role ?? null)
    })
  }, [])

  async function switchTo(account: (typeof TEST_ACCOUNTS)[number]) {
    if (!account.email || !account.password) return
    setLoading(account.role)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    })
    if (!error) {
      router.push(account.redirect)
      router.refresh()
    } else {
      alert(`Sign-in failed: ${error.message}`)
    }
    setLoading(null)
  }

  const roleColour: Record<string, string> = {
    admin: 'text-purple-400',
    franchisee: 'text-blue-400',
    franchisor: 'text-emerald-400',
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans">
      {open ? (
        <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 w-60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              ⚡ Dev switcher
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Current user */}
          {currentEmail && (
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/50">
              <p className="text-[10px] text-slate-500 mb-0.5">Currently signed in</p>
              <p className="text-xs text-slate-300 truncate">{currentEmail}</p>
              {currentRole && (
                <p className={`text-[10px] font-semibold mt-0.5 capitalize ${roleColour[currentRole] ?? 'text-slate-400'}`}>
                  {currentRole}
                </p>
              )}
            </div>
          )}

          {/* Account buttons */}
          <div className="p-2 space-y-1">
            {TEST_ACCOUNTS.map(account => {
              const isActive = account.email && account.email === currentEmail
              const missing = !account.email

              return (
                <button
                  key={account.role}
                  disabled={loading !== null || isActive || missing}
                  onClick={() => switchTo(account)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-slate-700 opacity-60 cursor-default'
                      : missing
                      ? 'opacity-30 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-base shrink-0">{account.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      {account.label}
                      {isActive && (
                        <span className="text-[9px] font-normal text-slate-500 bg-slate-600 px-1.5 py-0.5 rounded">
                          active
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {missing ? 'Not configured in .env.local' : account.email}
                    </p>
                  </div>
                  {loading === account.role && (
                    <span className="text-xs text-slate-400 shrink-0">…</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-slate-800">
            <p className="text-[9px] text-slate-600 leading-relaxed">
              Set NEXT_PUBLIC_DEV_*_EMAIL + PASSWORD in .env.local
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-slate-900/90 backdrop-blur text-white rounded-full px-3 py-2 text-xs font-semibold shadow-xl border border-slate-700 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
        >
          <span>⚡</span>
          <span className="text-slate-400">Dev</span>
          {currentRole && (
            <span className={`font-semibold capitalize ${roleColour[currentRole] ?? ''}`}>
              · {currentRole}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
