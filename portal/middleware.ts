import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — always allow through without auth checks
  const publicPaths = [
    '/login',
    '/setup-account',
    '/auth/callback',
    '/auth/confirm',
    '/get-matched',
    '/api/leads',
  ]
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Build request headers with x-pathname injected BEFORE creating the Supabase client.
  // We must use NextResponse.next({ request: { headers } }) — NOT response.headers.set() —
  // because headers() in Server Components reads REQUEST headers, not response headers.
  // We also capture this in a variable so the setAll() closure can reuse it when
  // Supabase needs to rotate the session cookie (which replaces supabaseResponse).
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
          // Supabase calls this when it refreshes the session token.
          // We must recreate supabaseResponse here, but we preserve the
          // x-pathname in requestHeaders so it survives the replacement.
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

  // Look up role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, setup_complete')
    .eq('id', user.id)
    .single()

  // No profile row yet (trigger may not have fired) — send to setup
  if (!profile) {
    const setupUrl = request.nextUrl.clone()
    setupUrl.pathname = '/setup-account'
    return NextResponse.redirect(setupUrl)
  }

  // setup_complete gate — only portal paths, not API routes
  if (
    !profile.setup_complete &&
    !pathname.startsWith('/api/') &&
    pathname !== '/setup-account'
  ) {
    const setupUrl = request.nextUrl.clone()
    setupUrl.pathname = '/setup-account'
    return NextResponse.redirect(setupUrl)
  }

  const role = profile.role

  // Root path — redirect to their portal
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }

  // Enforce portal boundaries (admins may visit any section for preview)
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }
  if (pathname.startsWith('/franchisee') && role !== 'franchisee' && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }
  if (pathname.startsWith('/franchisor') && role !== 'franchisor' && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
