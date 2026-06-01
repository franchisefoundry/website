'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const token_hash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type') as 'invite' | 'recovery' | 'email' | 'magiclink' | null

    const supabase = createClient()

    async function handleAuth() {
      try {
        if (token_hash && type) {
          // Our sendMagicLink flow — direct token_hash, no PKCE needed
          const { error } = await supabase.auth.verifyOtp({ token_hash, type })
          if (error) { setErrorMsg(error.message); setStatus('error'); return }

        } else if (code) {
          // Supabase invite email flow — PKCE code exchange
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) { setErrorMsg(error.message); setStatus('error'); return }

        } else {
          // Implicit flow — access token in hash fragment
          const hash = window.location.hash.substring(1)
          const hashParams = new URLSearchParams(hash)
          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) { setErrorMsg(error.message); setStatus('error'); return }
          } else {
            setErrorMsg('Missing authentication token. Please try the link again or request a new one.')
            setStatus('error')
            return
          }
        }

        // Session established — read profile to decide where to send them
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setErrorMsg('Could not establish session. Please try logging in again.')
          setStatus('error')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, setup_complete')
          .eq('id', user.id)
          .single()

        // Determine destination
        let destination: string
        if (!profile || !profile.setup_complete) {
          destination = '/setup-account'
        } else if (profile.role === 'admin') {
          destination = '/admin'
        } else if (profile.role === 'franchisor') {
          destination = '/franchisor'
        } else if (profile.role === 'introducer') {
          destination = '/introducer'
        } else {
          destination = '/franchisee'
        }

        // Hard navigate so the session cookies are sent with the next server request.
        // router.replace() can race with cookie propagation after verifyOtp/setSession.
        window.location.href = destination

      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.')
        setStatus('error')
      }
    }

    handleAuth()
  }, [])

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh', background: '#f8fafc',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
        fontFamily: "'Sora', system-ui, sans-serif",
      }}>
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
          padding: '32px 40px', maxWidth: 400, width: '100%', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
            Sign-in failed
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
            {errorMsg}
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block', padding: '10px 24px',
              background: '#3a4a3a', color: '#fff', borderRadius: 8,
              fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Back to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes ffBreath { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }
      `}</style>
      <div style={{
        minHeight: '100vh', background: '#2a352a',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 20,
        fontFamily: "'Sora', system-ui, sans-serif",
      }}>
        <img src="/favicon-icon.png" alt="" width={64} height={64}
          style={{ animation: 'ffBreath 1.8s ease-in-out infinite' }} />
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', fontWeight: 500 }}>
          Signing you in…
        </p>
      </div>
    </>
  )
}
