import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import InviteFranchisorButton from './invite-button'
import SeedFranchisorsButton from './seed-button'
import FranchisorsCards from './FranchisorsCards'

const PROFILE_FIELDS = ['brand_name', 'category', 'teaser', 'investment_min', 'franchise_fee', 'logo_url', 'highlights']

export default async function FranchisorsPage() {
  const admin = createAdminClient()

  const [{ data: franchisors }, { data: matchRows }] = await Promise.all([
    admin
      .from('franchisor_profiles')
      .select('*, profiles(full_name, email)')
      .is('archived_at', null)
      .order('created_at', { ascending: false }),
    admin.from('matches').select('franchisor_id'),
  ])

  const candCount: Record<string, number> = {}
  ;(matchRows ?? []).forEach(m => { candCount[m.franchisor_id] = (candCount[m.franchisor_id] ?? 0) + 1 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardData = (franchisors ?? []).map((b: any) => {
    const filled = PROFILE_FIELDS.filter(k => b[k] != null && b[k] !== '').length
    return {
      id: b.id,
      brand_name: b.brand_name,
      category: b.category,
      email: b.profiles?.email ?? null,
      status: b.status,
      fee: b.franchise_fee
        ? `£${Math.round(b.franchise_fee / 1000)}k`
        : (b.investment_display || (b.investment_min ? `£${Math.round(b.investment_min / 1000)}k+` : '—')),
      cands: candCount[b.id] ?? 0,
      prog: Math.round((filled / PROFILE_FIELDS.length) * 100),
    }
  })

  return (
    <div>
      <PageHeader
        title="Franchisors"
        description="Brands onboarded to the network."
        action={
          <div className="flex flex-wrap gap-2 items-center">
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

      <FranchisorsCards brands={cardData} />
    </div>
  )
}
