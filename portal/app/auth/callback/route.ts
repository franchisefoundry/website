import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single()

        // New invite — no name set yet, go to setup
        if (!profile?.full_name) {
          return NextResponse.redirect(`${origin}/setup-account`)
        }

        const role = profile?.role ?? 'franchisee'
        return NextResponse.redirect(`${origin}/${role}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
