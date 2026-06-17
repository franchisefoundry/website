'use client'

import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input, Label } from '@/components/ui/input'

function LoginForm() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPass] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)

  // Forgot password state
  const [forgotMode, setForgotMode]   = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent]   = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const reason = searchParams.get('reason')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Incorrect email or password.')
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setForgotError(null)
    const supabase = createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${siteUrl}/auth/reset-password`,
    })
    setLoading(false)
    if (error) {
      setForgotError(error.message)
      return
    }
    setForgotSent(true)
  }

  // ── Forgot password panel ────────────────────────────────────────────────────
  if (forgotMode) {
    return (
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {forgotSent ? (
            <>
              <div className="text-3xl mb-3">📬</div>
              <h1 className="text-xl font-semibold text-slate-900 mb-1">Check your inbox</h1>
              <p className="text-sm text-slate-500 mb-6">
                We&apos;ve sent a password reset link to <span className="font-medium text-slate-700">{forgotEmail}</span>.
                It may take a minute to arrive.
              </p>
              <Button
                fullWidth
                className="py-2.5"
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail('') }}
              >
                Back to sign in
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-slate-900 mb-1">Reset password</h1>
              <p className="text-sm text-slate-500 mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleForgot} className="space-y-4">
                <Field label="Email address" error={forgotError}>
                  <Input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </Field>
                <Button type="submit" fullWidth className="py-2.5" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
                <Button type="button" variant="ghost" fullWidth onClick={() => setForgotMode(false)}>
                  ← Back to sign in
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Login panel ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">Sign in</h1>
        {reason === 'idle' ? (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
            You were signed out due to inactivity.
          </p>
        ) : (
          <p className="text-sm text-slate-500 mb-6">
            Enter your details to access the portal.
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Email address">
            <Input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">Password</Label>
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="text-xs text-brand-green hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth className="py-2.5" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Don&apos;t have access?{' '}
        <a href="mailto:connect@franchisefoundry.co.uk" className="text-brand-green hover:underline">
          Contact Franchise Foundry
        </a>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
