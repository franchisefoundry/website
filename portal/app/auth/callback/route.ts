import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  // Use NEXT_PUBLIC_SITE_URL as the most reliable base URL.
  // x-forwarded-host can be null on some Netlify deployments.
  const base =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : process.env.NEXT_PUBLIC_SITE_URL ?? `https://${request.headers.get('x-forwarded-host')}`

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=no_code`)
  }

  // Create the redirect response BEFORE running the exchange so we can
  // write session cookies directly onto it (cookies set on cookieStore are
  // NOT automatically transferred onto a NextResponse.redirect object).
  const response = NextResponse.redirect(`${base}/setup-account`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.cookies.set(name, value, options as any)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Include the error in the URL so we can see exactly what went wrong
    return NextResponse.redirect(
      `${base}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  return response
}
