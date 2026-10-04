import { createAdminClient } from '@/lib/supabase/admin'
import { addTerritory, setTerritoryStatus, deleteTerritory } from '@/app/admin/territories/actions'

const STATUS = ['open', 'reserved', 'taken'] as const
const pill: Record<string, string> = {
  open: 'bg-ff-green/10 text-ff-green',
  reserved: 'bg-ff-gold-soft text-ff-gold-ink',
  taken: 'bg-surface-2 text-ink-3',
}

/** Per-brand territory management, embedded on the brand record. */
export async function BrandTerritories({ franchisorId }: { franchisorId: string }) {
  const admin = createAdminClient()
  const { data: territories } = await admin
    .from('territories').select('*').eq('franchisor_id', franchisorId).order('created_at', { ascending: false })
  const T = territories ?? []
  const input = 'px-2.5 py-1.5 border border-line rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-ff-green'

  return (
    <div>
      <form action={addTerritory} className="flex flex-wrap items-center gap-2 mb-3">
        <input type="hidden" name="franchisor_id" value={franchisorId} />
        <input name="name" required placeholder="Territory (e.g. Manchester)" className={input} />
        <input name="region" placeholder="Region" className={`${input} w-28`} />
        <select name="status" defaultValue="open" className={input}>
          {STATUS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-ff-green text-white hover:brightness-110 transition-all">Add</button>
      </form>

      {T.length === 0 ? (
        <p className="text-sm text-ink-3">No territories yet.</p>
      ) : (
        <div className="space-y-1.5">
          {T.map(t => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-line-2 px-3.5 py-2">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-ink">{t.name}</span>
                {t.region && <span className="text-xs text-ink-3 ml-2">{t.region}</span>}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${pill[t.status] ?? pill.open}`}>{t.status}</span>
              <form action={setTerritoryStatus} className="flex items-center gap-1">
                <input type="hidden" name="id" value={t.id} />
                <select name="status" defaultValue={t.status} className="text-xs border border-line rounded-lg px-2 py-1 bg-surface text-ink-2 capitalize">
                  {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="text-xs font-medium text-ff-green hover:underline">Set</button>
              </form>
              <form action={deleteTerritory}>
                <input type="hidden" name="id" value={t.id} />
                <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
