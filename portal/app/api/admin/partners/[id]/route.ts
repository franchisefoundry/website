import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { triggerWebsiteBuild } from '@/lib/foundry/website-build'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return createAdminClient()
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

  const body = await request.json()
  // Keep The Foundry's status in step with the directory's Active toggle (and back).
  if (typeof body?.status === 'string') body.is_active = body.status === 'live'
  else if (typeof body?.is_active === 'boolean') {
    const { data: cur } = await admin.from('partners').select('status').eq('id', id).maybeSingle()
    if (body.is_active) body.status = 'live'
    else if (cur?.status === 'live') body.status = 'paused'
  }
  const { data, error } = await admin.from('partners').update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.status === 'live' || typeof body?.status === 'string') await triggerWebsiteBuild(`${data?.name ?? 'Partner'} changed in the directory`)
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 403 })

  const { error } = await admin.from('partners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
