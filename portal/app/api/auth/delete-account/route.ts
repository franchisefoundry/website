import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * DELETE /api/auth/delete-account
 *
 * GDPR Article 17 — Right to Erasure.
 * Permanently deletes the authenticated user's own account and all associated data.
 * Admins cannot be deleted via this endpoint (to protect portal access).
 */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Protect admin accounts from self-deletion via this public endpoint
  if (profile?.role === 'admin') {
    return NextResponse.json(
      { error: 'Admin accounts cannot be deleted via this endpoint. Contact a system administrator.' },
      { status: 403 }
    )
  }

  const role = profile?.role

  // Delete role-specific profile data first (cascades matches, notifications, etc.)
  if (role === 'franchisee') {
    await admin.from('franchisee_profiles').delete().eq('user_id', user.id)
  } else if (role === 'franchisor') {
    await admin.from('franchisor_profiles').delete().eq('user_id', user.id)
  } else if (role === 'introducer') {
    await admin.from('introducer_profiles').delete().eq('user_id', user.id)
  }

  // Delete base profile and notifications
  await admin.from('notifications').delete().eq('user_id', user.id)
  await admin.from('profiles').delete().eq('id', user.id)

  // Delete the auth user (must be last)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
