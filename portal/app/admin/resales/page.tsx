import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import { Section } from '@/components/crm/Section'
import { Avatar } from '@/components/ui/Avatar'
import { addResale, setResaleStatus, deleteResale } from './actions'

export const dynamic = 'force-dynamic'

const STATUS = ['available', 'under_offer', 'sold'] as const
const pill: Record<string, string> = {
  available: 'bg-ff-green/10 text-ff-green',
  under_offer: 'bg-ff-gold-soft text-ff-gold-ink',
  sold: 'bg-surface-2 text-ink-3',
}
const label: Record<string, string> = { available: 'Available', under_offer: 'Under offer', sold: 'Sold' }

export default async function ResalesPage() {
  const admin = createAdminClient()
  const { data: resales } = await admin.from('resales').select('*').order('created_at', { ascending: false })
  const R = resales ?? []
  const input = 'px-3 py-2 border border-line rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-ff-green'

  return (
    <div className="max-w-5xl">
      <PageHeader title="Resales" description="Existing franchises for resale across the network." />

      <Section title="List a resale" className="mb-5">
        <form action={addResale} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <input name="brand_name" required placeholder="Brand *" className={input} />
          <input name="location" placeholder="Location" className={input} />
          <input name="asking_price" placeholder="Asking price (£)" className={input} />
          <input name="turnover" placeholder="Turnover (e.g. £310k/yr)" className={input} />
          <input name="reason" placeholder="Reason for sale" className={input} />
          <div className="flex gap-2.5">
            <select name="status" className={`${input} flex-1`} defaultValue="available">
              {STATUS.map(s => <option key={s} value={s}>{label[s]}</option>)}
            </select>
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-ff-green text-white hover:brightness-110 transition-all">Add</button>
          </div>
        </form>
      </Section>

      {R.length === 0 ? (
        <div className="text-center py-16 text-ink-3 text-sm">No resales listed yet.</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {R.map(r => (
            <div key={r.id} className="bg-surface border border-line rounded-2xl p-[17px] shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={r.brand_name} size="lg" square />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{r.brand_name}</p>
                  <p className="text-xs text-ink-3 truncate">{r.location || '—'}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${pill[r.status] ?? pill.available}`}>{label[r.status] ?? r.status}</span>
              </div>
              <div className="flex gap-1.5 border-t border-line-2 pt-3">
                {[['Asking', r.asking_price ? `£${r.asking_price.toLocaleString()}` : '—'], ['Turnover', r.turnover || '—']].map(([l, v]) => (
                  <div key={l} className="flex-1"><p className="text-sm font-bold text-ink tabular-nums leading-none">{v}</p><p className="text-[10.5px] text-ink-3 mt-1">{l}</p></div>
                ))}
              </div>
              {r.reason && <p className="text-xs text-ink-2 mt-3">Reason: {r.reason}</p>}
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-line-2">
                <form action={setResaleStatus} className="flex items-center gap-1.5">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} className="text-xs border border-line rounded-lg px-2 py-1.5 bg-surface text-ink-2">
                    {STATUS.map(s => <option key={s} value={s}>{label[s]}</option>)}
                  </select>
                  <button className="text-xs font-medium text-ff-green hover:underline">Update</button>
                </form>
                <form action={deleteResale} className="ml-auto">
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
