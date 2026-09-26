import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import InviteFranchisorButton from './invite-button'
import SeedFranchisorsButton from './seed-button'
import FranchisorsCards from './FranchisorsCards'
import ViewToggle, { currentView } from '@/components/admin/ViewToggle'
import { KanbanBoard } from '@/components/admin/KanbanBoard'
import { ListTable, type ListColumn } from '@/components/admin/ListTable'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { statusBadge } from '@/components/ui/badge'

const PROFILE_FIELDS = ['brand_name', 'category', 'teaser', 'investment_min', 'franchise_fee', 'logo_url', 'highlights']

const BRAND_COLUMNS = [
  { key: 'draft', label: 'Draft', dot: 'var(--ff-ink-3)' },
  { key: 'pending_review', label: 'Pending review', dot: 'var(--ff-gold)' },
  { key: 'active', label: 'Active', dot: 'var(--ff-green)' },
]

export default async function FranchisorsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const current = currentView((await searchParams).view)
  const admin = createAdminClient()

  const [{ data: franchisors }, { data: matchRows }] = await Promise.all([
    admin.from('franchisor_profiles').select('*, profiles(full_name, email)').is('archived_at', null).order('created_at', { ascending: false }),
    admin.from('matches').select('franchisor_id'),
  ])

  const candCount: Record<string, number> = {}
  ;(matchRows ?? []).forEach(m => { candCount[m.franchisor_id] = (candCount[m.franchisor_id] ?? 0) + 1 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cardData = (franchisors ?? []).map((b: any) => {
    const filled = PROFILE_FIELDS.filter(k => b[k] != null && b[k] !== '').length
    return {
      id: b.id, brand_name: b.brand_name, category: b.category, email: b.profiles?.email ?? null,
      status: b.status, logo_url: b.logo_url ?? null,
      fee: b.franchise_fee ? `£${Math.round(b.franchise_fee / 1000)}k` : (b.investment_display || (b.investment_min ? `£${Math.round(b.investment_min / 1000)}k+` : '—')),
      cands: candCount[b.id] ?? 0,
      prog: Math.round((filled / PROFILE_FIELDS.length) * 100),
    }
  })
  type BrandRow = typeof cardData[number]

  const listColumns: ListColumn<BrandRow>[] = [
    { header: 'Brand', cell: b => (
      <div className="flex items-center gap-2.5">
        <BrandLogo src={b.logo_url} name={b.brand_name} size="sm" />
        <div className="min-w-0"><p className="font-medium text-ink truncate">{b.brand_name || 'Incomplete profile'}</p><p className="text-xs text-ink-3 truncate">{b.email || '—'}</p></div>
      </div>
    ) },
    { header: 'Category', cell: b => <span className="text-ink-2">{b.category || '—'}</span>, className: 'hidden md:table-cell' },
    { header: 'Status', cell: b => statusBadge(b.status ?? 'unknown') },
    { header: 'Candidates', cell: b => <span className="tabular-nums text-ink-2">{b.cands}</span>, className: 'hidden sm:table-cell' },
    { header: 'Profile', cell: b => <span className="tabular-nums text-ink-2">{b.prog}%</span>, className: 'hidden sm:table-cell' },
  ]

  return (
    <div>
      <PageHeader
        title="Franchisors"
        description="Brands onboarded to the network."
        action={
          <div className="flex flex-wrap gap-2 items-center">
            <ViewToggle current={current} basePath="/admin/franchisors" />
            <Link href="/admin/questionnaires" className="text-sm font-medium text-ink-2 border border-line hover:border-[#cdd2c8] px-4 py-2 rounded-lg transition-colors">Questionnaires</Link>
            <SeedFranchisorsButton />
            <Link href="/admin/franchisors/new" className="bg-ff-green hover:bg-ff-green-deep text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">Add brand</Link>
            <InviteFranchisorButton />
          </div>
        }
      />

      {cardData.length === 0 ? (
        <div className="text-center py-16 text-ink-3 text-sm">No brands yet.</div>
      ) : current === 'cards' ? (
        <FranchisorsCards brands={cardData} />
      ) : current === 'kanban' ? (
        <KanbanBoard
          columns={BRAND_COLUMNS}
          items={cardData}
          groupBy={b => (['draft', 'pending_review', 'active'].includes(b.status ?? '') ? (b.status as string) : 'draft')}
          hrefFor={b => `/admin/franchisors/${b.id}`}
          renderCard={b => (
            <>
              <div className="flex items-center gap-2">
                <BrandLogo src={b.logo_url} name={b.brand_name} size="sm" />
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink truncate">{b.brand_name || 'Incomplete'}</p><p className="text-[11px] text-ink-3 truncate">{b.category || '—'}</p></div>
              </div>
              <div className="flex gap-3 mt-2 text-[11px] text-ink-3 tabular-nums"><span>{b.cands} candidates</span><span>{b.prog}% profile</span></div>
            </>
          )}
        />
      ) : (
        <ListTable columns={listColumns} rows={cardData} hrefFor={b => `/admin/franchisors/${b.id}`} />
      )}
    </div>
  )
}
