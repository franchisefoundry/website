import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

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

  const { title, content, templateKey } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  const name = (title?.trim() || 'Franchise Agreement')

  const admin = createAdminClient()

  // Each template is identified by template_key; saving versions that key.
  // A new template (no key given) derives a stable key from its name.
  const baseKey = templateKey?.trim() || slugify(name) || 'master'
  let key = baseKey
  if (!templateKey) {
    // New template — ensure the derived key is unique.
    const { data: clash } = await admin.from('agreements').select('id').eq('template_key', baseKey).limit(1).maybeSingle()
    if (clash) key = `${baseKey}-${Date.now().toString(36)}`
  }

  // Next version within this template.
  const { data: current } = await admin
    .from('agreements').select('version').eq('template_key', key).order('version', { ascending: false }).limit(1).maybeSingle()
  const nextVersion = (current?.version ?? 0) + 1

  // Mark the previous current version of THIS template as not current.
  await admin.from('agreements').update({ is_current: false }).eq('template_key', key).eq('is_current', true)

  const { data: inserted, error } = await admin
    .from('agreements')
    .insert({ title: name, name, content, version: nextVersion, template_key: key, created_by: user.id, is_current: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ agreement: inserted })
}
