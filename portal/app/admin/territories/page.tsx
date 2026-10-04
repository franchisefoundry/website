import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/crm/Section'
import { addTerritory, setTerritoryStatus, deleteTerritory } from './actions'

export const dynamic = 'force-dynamic'

const STATUS = ['open', 'reserved', 'taken'] as const
const pill: Record<string, string> = {
  open: 'bg-ff-green/10 text-ff-green',
  reserved: 'bg-ff-gold-soft text-ff-gold-ink',
  taken: 'bg-surface-2 text-ink-3',
}

export default async function TerritoriesPage() {
  const admin = createAdminClient()
  const [{ data: territories }, { data: brands }] = await Promise.all([
    admin.from('territories').select('*, franchisor_profiles(brand_name)').order('created_at', { ascending: false }),
    admin.from('franchisor_profiles').select('id, brand_name').order('brand_name'),
  ])

  const T = territories ?? [], B = brands ?? []
  const input = 'px-3 py-2 border border-line rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-ff-green'

  return (
    <div className="max-w-5xl">
      <PageHeader title="Territories" description="Where each brand is expanding — track open, reserved and taken areas." />

      <Section title="Add a territory" className="mb-5">
        <form action={addTerritory} className="flex flex-wrap items-end gap-2.5">
          <select name="franchisor_id" required className={input} defaultValue="">
            <option value="" disabled>Select brand…</option>
            {B.map(b => <option key={b.id} value={b.id}>{b.brand_name || 'Unnamed'}</option>)}
          </select>
          <input name="name" required placeholder="Territory (e.g. Manchester)" className={input} />
          <input name="region" placeholder="Region (optional)" className={input} />
          <select name="status" className={input} defaultValue="open">
            {STATUS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-ff-green text-white hover:brightness-110 transition-all">Add</button>
        </form>
      </Section>

      {T.length === 0 ? (
        <div className="text-center py-16 text-ink-3 text-sm">No territories yet. Add one above.</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {T.map(t => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const brand = (t.franchisor_profiles as any)?.brand_name
            return (
              <div key={t.id} className="bg-surface border border-line rounded-2xl p-[17px] shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{t.name}</p>
                    <p className="text-xs text-ink-3 truncate">{[brand, t.region].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${pill[t.status] ?? pill.open}`}>{t.status}</span>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-line-2">
                  <form action={setTerritoryStatus} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={t.id} />
                    <select name="status" defaultValue={t.status} className="text-xs border border-line rounded-lg px-2 py-1.5 bg-surface text-ink-2 capitalize">
                      {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="text-xs font-medium text-ff-green hover:underline">Update</button>
                  </form>
                  <form action={deleteTerritory} className="ml-auto">
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
