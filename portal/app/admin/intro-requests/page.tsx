import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { MarketplaceTabs } from '@/components/admin/MarketplaceTabs'
import { Avatar } from '@/components/ui/Avatar'
import { statusBadge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import IntroStatusSelect from './intro-status-select'

export default async function IntroRequestsPage() {
  const supabase = await createClient()

  const { data: requests } = await supabase
    .from('intro_requests')
    .select('*, profiles(full_name, email), partners(name, sector)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Marketplace"
        description="Requests from franchisees and franchisors to be connected with a partner."
      />
      <MarketplaceTabs />

      {(!requests || requests.length === 0) ? (
        <div className="text-center py-16 text-ink-3 text-sm">No intro requests yet.</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {requests.map(r => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const requester = r.profiles as any
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const partner = r.partners as any
            return (
              <div key={r.id} className="bg-surface border border-line rounded-2xl p-[17px] shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={requester?.full_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{requester?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-ink-3 truncate">{requester?.email}</p>
                  </div>
                  {statusBadge(r.status)}
                </div>

                <div className="rounded-xl border border-line-2 bg-surface-2 px-3.5 py-2.5 mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3 mb-0.5">Requesting intro to</p>
                  <p className="text-sm font-semibold text-ink">{partner?.name || '—'}</p>
                  {partner?.category && <p className="text-xs text-ink-3 capitalize">{partner.category}</p>}
                </div>

                {r.message && <p className="text-xs text-ink-2 leading-relaxed mb-3 line-clamp-3">“{r.message}”</p>}

                <div className="flex items-center justify-between pt-3 border-t border-line-2">
                  <span className="text-xs text-ink-3">{formatDate(r.created_at)}</span>
                  <IntroStatusSelect requestId={r.id} currentStatus={r.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
