import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // In production (Netlify/Vercel), use the forwarded host — the raw
      // origin may be an internal address behind the load balancer
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocal = process.env.NODE_ENV === 'development'
      const base = isLocal ? origin : `https://${forwardedHost}`

      return NextResponse.redirect(`${base}/setup-account`)
    }
  }

  // Code missing or exchange failed — back to login
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  const base = isLocal ? origin : `https://${forwardedHost}`

  return NextResponse.redirect(`${base}/login?error=auth_failed`)
}
