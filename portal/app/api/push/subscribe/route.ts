import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * POST /api/push/subscribe
 * Body: a PushSubscription JSON { endpoint, keys: { p256dh, auth } }
 * Saves (upserts) the device subscription for the signed-in user.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const sub = await req.json().catch(() => null)
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: req.headers.get('user-agent'),
      },
      { onConflict: 'endpoint' },
    )

  if (error) {
    console.error('[push/subscribe] insert failed', error)
    return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/push/subscribe
 * Body: { endpoint }  — removes this device's subscription.
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { endpoint } = await req.json().catch(() => ({ endpoint: null }))
  if (!endpoint) return NextResponse.json({ error: 'Missing endpoint.' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) return NextResponse.json({ error: 'Could not remove subscription.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
