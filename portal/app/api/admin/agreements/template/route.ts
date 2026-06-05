import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — fetch the current template
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('agreements')
    .select('*')
    .eq('is_current', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ agreement: data ?? null })
}

// PUT — save (or create) the current template
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const admin = createAdminClient()

  // Get current version number
  const { data: current } = await admin
    .from('agreements')
    .select('version')
    .eq('is_current', true)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (current?.version ?? 0) + 1

  // Mark old as not current
  await admin.from('agreements').update({ is_current: false }).eq('is_current', true)

  // Insert new version
  const { data: inserted, error } = await admin
    .from('agreements')
    .insert({
      title: title?.trim() || 'Franchise Agreement',
      content,
      version: nextVersion,
      created_by: user.id,
      is_current: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ agreement: inserted })
}
