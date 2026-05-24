import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, redirectTo } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const admin = createAdminClient()

  // Look up the user's auth email
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId)
  if (userError || !userData?.user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Generate a one-time magic link for that user
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
    options: {
      redirectTo: redirectTo ?? siteUrl,
    },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = (data as any)?.properties?.action_link
  if (!link) return NextResponse.json({ error: 'Failed to generate link' }, { status: 500 })

  return NextResponse.json({ link })
}
