'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const supabase = createClient()

    // Listen for auth state change — handles BOTH:
    // 1. PKCE flow: code in URL query param (?code=xxx)
    // 2. Implicit flow: token in URL hash (#access_token=xxx)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.replace('/setup-account')
      }
    })

    // Handle PKCE code flow manually if code is present
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          subscription.unsubscribe()
          router.replace('/login?error=auth_failed')
        }
        // If successful, onAuthStateChange above will fire and redirect
      })
    }

    // Fallback timeout — if nothing happens in 10s, go to login
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/login')
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-500">Signing you in…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Signing you in…</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
