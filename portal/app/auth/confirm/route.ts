import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'invite' | 'recovery' | 'email' | 'magiclink' | null
  const code = searchParams.get('code')

  const base =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : process.env.NEXT_PUBLIC_SITE_URL!

  // Nothing usable in the URL
  if (!token_hash && !code) {
    return NextResponse.redirect(`${base}/login?error=missing_token`)
  }

  const response = NextResponse.redirect(`${base}/setup-account`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.cookies.set(name, value, options as any)
          })
        },
      },
    }
  )

  if (token_hash && type) {
    // OTP / invite flow
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) {
      return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`)
    }
  } else if (code) {
    // PKCE flow (magic link / OAuth)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  return response
}
