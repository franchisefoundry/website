'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const token_hash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type') as 'invite' | 'recovery' | 'email' | 'magiclink' | null

    const supabase = createClient()

    async function handleAuth() {
      if (token_hash && type) {
        // Our sendMagicLink flow — direct token_hash, no PKCE needed
        const { error } = await supabase.auth.verifyOtp({ token_hash, type })
        if (error) { router.replace(`/login?error=${encodeURIComponent(error.message)}`); return }

      } else if (code) {
        // Supabase invite email flow — PKCE code exchange
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) { router.replace(`/login?error=${encodeURIComponent(error.message)}`); return }

      } else {
        // Implicit flow — access token in hash fragment
        const hash = window.location.hash.substring(1)
        const hashParams = new URLSearchParams(hash)
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) { router.replace(`/login?error=${encodeURIComponent(error.message)}`); return }
        } else {
          router.replace('/login?error=missing_token')
          return
        }
      }

      // Session established — route by role
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login?error=no_session'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') router.replace('/admin')
      else if (profile?.role === 'franchisor') router.replace('/franchisor')
      else router.replace('/franchisee')
    }

    handleAuth()
  }, [router])

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
