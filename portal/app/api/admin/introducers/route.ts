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

  // Create or update user with introducer role
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: email.trim().toLowerCase(),
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'}/auth/callback?next=/setup-account`,
      data: {
        full_name: full_name.trim(),
        role: 'introducer',
      },
    },
  })

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 })

  // Upsert profile with introducer role
  const userId = linkData?.user?.id
  if (userId) {
    await admin.from('profiles').upsert({
      id: userId,
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      role: 'introducer',
      setup_complete: true,
    }, { onConflict: 'id' })
  }

  return NextResponse.json({
    success: true,
    invite_link: linkData?.properties?.action_link ?? null,
  })
}
