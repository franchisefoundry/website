import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

// PATCH — update question text / options (non-profile-linked only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!await verifyAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const admin = createAdminClient()

  // Safety: cannot edit profile-linked questions
  const { data: q } = await admin
    .from('questionnaire_questions')
    .select('is_profile_linked')
    .eq('id', id)
    .single()

  if (q?.is_profile_linked) {
    return NextResponse.json({ error: 'Profile-linked questions cannot be edited' }, { status: 403 })
  }

  const updates: Record<string, unknown> = {}
  if (body.question_text !== undefined) updates.question_text = body.question_text
  if (body.options !== undefined) updates.options = body.options?.length ? body.options : null
  if (body.input_type !== undefined) updates.input_type = body.input_type
  if (body.textarea_rows !== undefined) updates.textarea_rows = body.textarea_rows

  const { error } = await admin
    .from('questionnaire_questions')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — soft delete (is_active = false), non-profile-linked only
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!await verifyAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: q } = await admin
    .from('questionnaire_questions')
    .select('is_profile_linked')
    .eq('id', id)
    .single()

  if (q?.is_profile_linked) {
    return NextResponse.json({ error: 'Profile-linked questions cannot be removed' }, { status: 403 })
  }

  const { error } = await admin
    .from('questionnaire_questions')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
