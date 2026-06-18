import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/account/notification-prefs  { prefs: { [eventKey]: boolean } }
 * Saves the signed-in user's per-event email preferences.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { prefs } = await req.json().catch(() => ({ prefs: null }))
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
    return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400 })
  }

  // Coerce to a clean { string: boolean } map — ignore anything malformed
  const clean: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(prefs)) {
    if (typeof v === 'boolean') clean[k] = v
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ notification_prefs: clean })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Could not save preferences.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
