import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/account/notification-prefs
 * Body may contain either or both:
 *   { prefs:     { [eventKey]: boolean } }  → email preferences
 *   { pushPrefs: { [eventKey]: boolean } }  → push preferences
 * Saves the signed-in user's per-event preferences for the field(s) supplied.
 */
function cleanMap(input: unknown): Record<string, boolean> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const clean: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === 'boolean') clean[k] = v
  }
  return clean
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, Record<string, boolean>> = {}

  if ('prefs' in body) {
    const clean = cleanMap(body.prefs)
    if (!clean) return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400 })
    update.notification_prefs = clean
  }
  if ('pushPrefs' in body) {
    const clean = cleanMap(body.pushPrefs)
    if (!clean) return NextResponse.json({ error: 'Invalid preferences.' }, { status: 400 })
    update.push_prefs = clean
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Could not save preferences.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
