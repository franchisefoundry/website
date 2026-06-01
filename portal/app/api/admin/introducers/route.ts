import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'introducer')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { full_name, email } = await request.json()
  if (!full_name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

  const admin = createAdminClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'

  // Send invite email directly — user gets a sign-in link in their inbox
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: { full_name: full_name.trim(), role: 'introducer' },
      redirectTo: `${siteUrl}/auth/callback?next=/setup-account`,
    }
  )

  if (inviteError && !inviteError.message.toLowerCase().includes('already')) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Resolve user id (existing user if already registered)
  let userId = inviteData?.user?.id
  if (!userId) {
    const { data: { users } } = await admin.auth.admin.listUsers()
    userId = users.find(u => u.email === email.trim().toLowerCase())?.id
  }

  if (userId) {
    await admin.from('profiles').upsert({
      id: userId,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      role: 'introducer',
      setup_complete: true,
    }, { onConflict: 'id' })
  }

  return NextResponse.json({ success: true })
}
