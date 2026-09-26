import { createAdminClient } from '@/lib/supabase/admin'

const pill: Record<string, string> = {
  open: 'bg-ff-green/10 text-ff-green',
  reserved: 'bg-ff-gold-soft text-ff-gold-ink',
  taken: 'bg-surface-2 text-ink-3',
}

/** Read-only territory list for a brand — changes are handled by the FF team. */
export async function BrandTerritoriesView({ franchisorId }: { franchisorId: string }) {
  const admin = createAdminClient()
  const { data } = await admin.from('territories').select('*').eq('franchisor_id', franchisorId).order('name')
  const T = data ?? []

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)] p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-ink">Your territories</h3>
          <p className="text-xs text-ink-2 mt-0.5">Where your brand is open, reserved or taken. Contact the FF team to update coverage.</p>
        </div>
        <span className="text-xs font-semibold text-ff-green tabular-nums">{T.length} mapped</span>
      </div>

      {T.length === 0 ? (
        <p className="text-sm text-ink-3">No territories mapped yet — the FF team sets these up with you.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {T.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-line-2 px-3.5 py-2.5">
              <div className="min-w-0">
                <span className="text-sm font-medium text-ink">{t.name}</span>
                {t.region && <span className="text-xs text-ink-3 ml-2">{t.region}</span>}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${pill[t.status] ?? pill.open}`}>{t.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
