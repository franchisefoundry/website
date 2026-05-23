import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { franchisorId, updates } = await request.json()
    if (!franchisorId || !updates) {
      return NextResponse.json({ error: 'franchisorId and updates are required' }, { status: 400 })
    }

    // Verify the franchisor profile belongs to this user
    const { data: profile } = await supabase
      .from('franchisor_profiles')
      .select('id')
      .eq('id', franchisorId)
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('franchisor_questionnaires')
      .update(updates)
      .eq('franchisor_id', franchisorId)

    if (error) {
      console.error('Questionnaire update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Questionnaire PATCH error:', err)
    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
