import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/accounts
 * Lists the accounts an admin can switch into (franchisees, brands, agents),
 * each with its auth user id + role, for the account switcher.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: profiles }, { data: brands }] = await Promise.all([
    admin.from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['franchisee', 'franchisor', 'introducer'])
      .is('archived_at', null),
    admin.from('franchisor_profiles').select('user_id, brand_name').is('archived_at', null),
  ])

  // Brand names are friendlier than the contact's name for franchisors.
  const brandByUser = new Map((brands ?? []).filter(b => b.user_id).map(b => [b.user_id, b.brand_name]))

  const accounts = (profiles ?? []).map(p => ({
    id: p.id,
    role: p.role,
    name: (p.role === 'franchisor' ? brandByUser.get(p.id) : null) || p.full_name || p.email || 'Account',
    email: p.email,
  })).sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ accounts })
}
