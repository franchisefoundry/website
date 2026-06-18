import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import InviteFranchisorButton from './invite-button'
import SeedFranchisorsButton from './seed-button'
import FranchisorsTable from './FranchisorsTable'
import RoleInvites from '@/components/admin/RoleInvites'

export default async function FranchisorsPage() {
  const admin = createAdminClient()

  const { data: franchisors } = await admin
    .from('franchisor_profiles')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  // Fetch last_sign_in_at for all franchisor users
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const lastLoginMap: Record<string, string | null> = {}
  authUsers.forEach(u => { lastLoginMap[u.id] = u.last_sign_in_at ?? null })

  return (
    <div>
      <PageHeader
        title="Franchisors"
        description="Brands onboarded to the network."
        action={
          <div className="flex gap-2 items-start">
            <SeedFranchisorsButton />
            <Link
              href="/admin/franchisors/new"
              className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Add brand
            </Link>
            <InviteFranchisorButton />
          </div>
        }
      />

      <FranchisorsTable
        franchisors={(franchisors ?? []) as Parameters<typeof FranchisorsTable>[0]['franchisors']}
        lastLoginMap={lastLoginMap}
      />

      <RoleInvites role="franchisor" title="Franchisor invites" />
    </div>
  )
}
