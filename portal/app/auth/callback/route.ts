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
        // Check if this is an invite flow — user has no password identity yet
        const hasPassword = user.identities?.some(i => i.provider === 'email') ?? false

        if (!hasPassword) {
          // Brand new invite — send to setup to set password + confirm details
          return NextResponse.redirect(`${origin}/setup-account`)
        }

        // Existing user following a magic link — send to their portal
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const role = profile?.role ?? 'franchisee'
        return NextResponse.redirect(`${origin}/${role}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
