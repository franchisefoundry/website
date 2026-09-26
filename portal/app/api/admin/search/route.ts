import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/search — lightweight index of records the ⌘K palette can jump
 * to (franchisees, brands, agents). Admin only; archived excluded.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: fes }, { data: brs }, { data: ags }] = await Promise.all([
    admin.from('franchisee_profiles').select('id, profiles!franchisee_profiles_user_id_fkey(full_name, role)').is('archived_at', null),
    admin.from('franchisor_profiles').select('id, brand_name').is('archived_at', null),
    admin.from('profiles').select('id, full_name').eq('role', 'introducer').is('archived_at', null),
  ])

  const records = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(fes ?? []).filter((f: any) => f.profiles?.role === 'franchisee').map((f: any) => ({ label: f.profiles?.full_name || 'Franchisee', type: 'Franchisee', href: `/admin/franchisees/${f.id}` })),
    ...(brs ?? []).map(b => ({ label: b.brand_name || 'Brand', type: 'Brand', href: `/admin/franchisors/${b.id}` })),
    ...(ags ?? []).map(a => ({ label: a.full_name || 'Agent', type: 'Agent', href: `/admin/introducers/${a.id}` })),
  ]

  return NextResponse.json({ records })
}
