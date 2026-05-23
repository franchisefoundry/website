import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: franchisorId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { updates } = await request.json()
  if (!updates) return NextResponse.json({ error: 'updates required' }, { status: 400 })

  const admin = createAdminClient()

  // Upsert — admin can save even if no questionnaire exists yet
  const { error } = await admin
    .from('franchisor_questionnaires')
    .upsert({ franchisor_id: franchisorId, ...updates }, { onConflict: 'franchisor_id' })

  if (error) {
    console.error('Admin questionnaire patch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
