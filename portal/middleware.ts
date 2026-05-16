import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Public routes — always allow through
  const publicPaths = ['/login', '/setup-account', '/auth/callback', '/auth/confirm', '/get-matched', '/api/leads']
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return supabaseResponse
  }

  // Check auth
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch role using service-role-level access via a direct header lookup
  // We use the anon client here — the user is authenticated so RLS allows them to read their own profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // If no profile yet (e.g. trigger hasn't fired), send to setup
  if (!profile) {
    if (pathname.startsWith('/setup-account')) return supabaseResponse
    const setupUrl = request.nextUrl.clone()
    setupUrl.pathname = '/setup-account'
    return NextResponse.redirect(setupUrl)
  }

  const role = profile.role

  // Root path — redirect to their portal
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${role}`, request.url))
  }

  // Enforce portal boundaries
  // Admins can visit any portal section (preview mode)
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
