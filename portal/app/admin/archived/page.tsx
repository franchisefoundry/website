import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/crm/Section'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'
import { RestoreButton } from '@/components/admin/RestoreButton'

export const dynamic = 'force-dynamic'

type Row = { id: string; name: string; reason: string | null; at: string | null; square?: boolean }

function Group({ title, type, rows }: { title: string; type: 'franchisees' | 'franchisors' | 'introducers'; rows: Row[] }) {
  if (rows.length === 0) return null
  return (
    <Section title={`${title} (${rows.length})`} className="mb-5">
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line-2 px-3.5 py-2.5">
            <Avatar name={r.name} size="md" square={r.square} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink truncate">{r.name}</p>
              <p className="text-xs text-ink-3 truncate">{[r.reason, r.at ? `archived ${formatDate(r.at)}` : null].filter(Boolean).join(' · ') || '—'}</p>
            </div>
            <RestoreButton type={type} id={r.id} />
          </div>
        ))}
      </div>
    </Section>
  )
}

export default async function ArchivedPage() {
  const admin = createAdminClient()
  const [{ data: fes }, { data: brs }, { data: ags }] = await Promise.all([
    admin.from('franchisee_profiles').select('id, archive_reason, archived_at, profiles!franchisee_profiles_user_id_fkey(full_name)').not('archived_at', 'is', null),
    admin.from('franchisor_profiles').select('id, brand_name, archive_reason, archived_at').not('archived_at', 'is', null),
    admin.from('profiles').select('id, full_name, archive_reason, archived_at').eq('role', 'introducer').not('archived_at', 'is', null),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feRows: Row[] = (fes ?? []).map((f: any) => ({ id: f.id, name: f.profiles?.full_name || 'Franchisee', reason: f.archive_reason, at: f.archived_at }))
  const brRows: Row[] = (brs ?? []).map(b => ({ id: b.id, name: b.brand_name || 'Brand', reason: b.archive_reason, at: b.archived_at, square: true }))
  const agRows: Row[] = (ags ?? []).map(a => ({ id: a.id, name: a.full_name || 'Agent', reason: a.archive_reason, at: a.archived_at }))

  const total = feRows.length + brRows.length + agRows.length

  return (
    <div className="max-w-4xl">
      <PageHeader title="Archived" description="Records that have been archived and had portal access removed. Restore to reactivate." />
      {total === 0 ? (
        <div className="text-center py-16 text-ink-3 text-sm">Nothing archived.</div>
      ) : (
        <>
          <Group title="Franchisees" type="franchisees" rows={feRows} />
          <Group title="Brands" type="franchisors" rows={brRows} />
          <Group title="Agents" type="introducers" rows={agRows} />
        </>
      )}
    </div>
  )
}
