import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import InviteFranchiseeButton from './invite-button'
import FranchiseeKanban from './FranchiseeKanban'
import FranchiseesListView from './FranchiseesListView'
import ViewToggle from './ViewToggle'

interface SearchParams { view?: string }

export default async function FranchiseesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { view } = await searchParams
  const isKanban = view !== 'list'   // kanban is the default

  const admin = createAdminClient()

  // Use explicit FK hint — franchisee_profiles has two FKs to profiles
  const { data: allFranchisees } = await admin
    .from('franchisee_profiles')
    .select('*, profiles!franchisee_profiles_user_id_fkey(full_name, email, phone, role)')
    .order('created_at', { ascending: false })

  // Only show users whose profile role is 'franchisee'
  const franchisees = (allFranchisees ?? []).filter(f => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (f.profiles as any)?.role === 'franchisee'
  })

  // Fetch last_sign_in_at for all franchisee users
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const lastLoginMap: Record<string, string | null> = {}
  authUsers.forEach(u => { lastLoginMap[u.id] = u.last_sign_in_at ?? null })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kanbanData = franchisees.map(f => ({
    id: f.id,
    investment_min: f.investment_min,
    investment_max: f.investment_max,
    pipeline_stage: f.pipeline_stage ?? null,
    status: f.status,
    internal_rating: (f as any).internal_rating ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profiles: (f.profiles as any) ?? null,
  }))

  return (
    <div>
      <PageHeader
        title="Franchisees"
        description="Everyone in the portal — active, pending and signed."
        action={
          <div className="flex items-center gap-3">
            <ViewToggle current={isKanban ? 'kanban' : 'list'} />
            <InviteFranchiseeButton />
          </div>
        }
      />

      {franchisees.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No franchisees yet. Invite one to get started.
        </div>
      ) : isKanban ? (
        <FranchiseeKanban franchisees={kanbanData} />
      ) : (
        <FranchiseesListView
          franchisees={franchisees as Parameters<typeof FranchiseesListView>[0]['franchisees']}
          lastLoginMap={lastLoginMap}
        />
      )}
    </div>
  )
}
