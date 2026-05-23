import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'admin'
}

// GET — all sections with their questions
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!await verifyAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: sections } = await admin
    .from('questionnaire_sections')
    .select('id, title, display_order, questionnaire_questions(id, question_text, field_key, input_type, options, textarea_rows, is_profile_linked, display_order, is_active)')
    .order('display_order')

  return NextResponse.json({ sections })
}

// POST — create a new custom question
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (!await verifyAdmin(supabase, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { section_id, question_text, input_type, options } = await request.json()
  if (!section_id || !question_text || !input_type) {
    return NextResponse.json({ error: 'section_id, question_text, and input_type are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get max display_order for this section
  const { data: existing } = await admin
    .from('questionnaire_questions')
    .select('display_order')
    .eq('section_id', section_id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = ((existing?.display_order ?? 0) + 10)

  // field_key: custom questions get a uuid-based key prefixed with 'custom_'
  const field_key = `custom_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`

  const { data: question, error } = await admin
    .from('questionnaire_questions')
    .insert({
      section_id,
      question_text,
      field_key,
      input_type,
      options: options?.length ? options : null,
      display_order: nextOrder,
      is_profile_linked: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ question })
}
