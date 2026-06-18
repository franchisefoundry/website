import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — always allow through without auth checks.
  // These are reached by unauthenticated users by design (invite acceptance,
  // password reset, account setup). Note: /api/auth/delete-account is NOT here —
  // it deletes the signed-in user and must stay behind auth.
  const publicPaths = [
    '/login',
    '/setup-account',
    '/invite',                    // invite landing page (consumes 72h token)
    '/auth/callback',
    '/auth/confirm',
    '/auth/reset-password',
    '/get-matched',
    '/api/leads',
    '/api/auth/invite',           // generates the on-demand magic link from a token
    '/api/auth/forgot-password',  // sends the Resend-backed reset email
  ]
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Inject x-pathname into request headers so Server Component layouts can
  // read it via headers(). Must use NextResponse.next({ request: { headers } })
  // because headers() reads REQUEST headers, not response headers.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          // Supabase replaces supabaseResponse when rotating session cookies.
          // Rebuild with the same requestHeaders so x-pathname is preserved.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  // Validate session
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Look up role + setup status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, setup_complete')
    .eq('id', user.id)
    .single()

  // No profile yet — send to setup
  if (!profile) {
    return NextResponse.redirect(new URL('/setup-account', request.url))
  }

  // setup_complete gate
  if (!profile.setup_complete && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/setup-account', request.url))
  }

  const role = profile.role

  // Root — send to their portal
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }

  // Portal boundary enforcement (admins can preview any portal)
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }
  if (pathname.startsWith('/franchisee') && role !== 'franchisee' && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }
  if (pathname.startsWith('/franchisor') && role !== 'franchisor' && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }
  if (pathname.startsWith('/introducer') && role !== 'introducer' && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }

  // ── Franchisor access gates ───────────────────────────────────────────────
  // Gate 1: no brand quiz completed → /franchisor/onboarding
  // Gate 2: all brands still pending (none active) → /franchisor/pending
  // Admins bypass both gates. Multi-brand: ANY active brand grants full access.
  if (
    role === 'franchisor' &&
    pathname.startsWith('/franchisor') &&
    !pathname.startsWith('/franchisor/onboarding') &&
    !pathname.startsWith('/franchisor/pending') &&
    // Franchisors can always view/edit their own questionnaire so they can
    // self-manage answers while awaiting (or after) review.
    !pathname.startsWith('/franchisor/questionnaire')
  ) {
    const { data: profiles } = await supabase
      .from('franchisor_profiles')
      .select('quiz_completed_at, status')
      .eq('user_id', user.id)

    const hasAnyCompleted = profiles?.some(p => p.quiz_completed_at)
    const hasAnyActive    = profiles?.some(p => p.status === 'active')

    if (!profiles?.length || !hasAnyCompleted) {
      return NextResponse.redirect(new URL('/franchisor/onboarding', request.url))
    }
    if (!hasAnyActive) {
      return NextResponse.redirect(new URL('/franchisor/pending', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
