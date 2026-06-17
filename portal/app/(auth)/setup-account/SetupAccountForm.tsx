'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

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
        .update({ full_name: fullName, phone: phone || null, setup_complete: true })
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

      // Hard navigate so the fresh session cookie from updateUser() is sent
      // with the next request — router.push() can race with the rotated token
      window.location.href = `/${profile?.role ?? 'franchisee'}`
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
          <Field label="Your full name">
            <Input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
            />
          </Field>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone number <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+44 7700 000000"
            />
          </div>

          <Field label="Set a password">
            <Input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
          </Field>

          <Field label="Confirm password">
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Saving…' : 'Finish setup'}
          </Button>
        </form>
      </div>
    </div>
  )
}
