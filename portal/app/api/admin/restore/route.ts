import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TABLES: Record<string, string> = {
  franchisees: 'franchisee_profiles',
  franchisors: 'franchisor_profiles',
  introducers: 'profiles',
}

/**
 * POST /api/admin/restore  { type, id }
 * Un-archives a record: clears the archive fields, reactivates it, and lifts the
 * sign-in ban on the auth user.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { type, id } = await req.json().catch(() => ({}))
  const table = TABLES[type]
  if (!table || !id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const admin = createAdminClient()

  // Resolve the auth user id to lift the ban.
  let authId: string | null = null
  if (type === 'introducers') {
    authId = id
  } else {
    const { data } = await admin.from(table).select('user_id').eq('id', id).single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authId = (data as any)?.user_id ?? null
  }

  const patch: Record<string, unknown> = { archived_at: null, archive_reason: null }
  if (type !== 'introducers') patch.status = 'active'
  await admin.from(table).update(patch).eq('id', id)

  if (authId) await admin.auth.admin.updateUserById(authId, { ban_duration: 'none' })

  return NextResponse.json({ success: true })
}
