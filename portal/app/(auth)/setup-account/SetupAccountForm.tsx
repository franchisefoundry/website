'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetupAccountForm() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, role')
        .eq('id', user.id)
        .single()

      if (profile?.full_name) setFullName(profile.full_name)
      if (profile?.phone) setPhone(profile.phone)
      setChecking(false)
    }
    checkSession()
  }, [router])

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.push('/login')
        return
      }

      // Set their password
      const { error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError) {
        setError(pwError.message)
        setLoading(false)
        return
      }

      // Save profile and mark setup complete
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone: phone || null })
        .eq('id', user.id)

      if (updateError) {
        setError(`Could not save profile: ${updateError.message}`)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      router.push(`/${profile?.role ?? 'franchisee'}`)
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Set up your account</h1>
        <p className="text-sm text-slate-500 mb-6">
          Welcome to Franchise Foundry. Confirm your details and set a password to get started.
        </p>

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your full name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone number <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="+44 7700 000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Set a password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="Min. 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Finish setup'}
          </button>
        </form>
      </div>
    </div>
  )
}
