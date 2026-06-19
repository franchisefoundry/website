import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
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
        title="Marketplace Intro Requests"
        description="Requests from franchisees and franchisors to be connected with a marketplace partner."
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Requester</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Partner</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Message</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Date</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-slate-400 text-center">
                  No intro requests yet.
                </td>
              </tr>
            )}
            {requests?.map(r => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const requester = r.profiles as any
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const partner = r.partners as any
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{requester?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">{requester?.email}</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{partner?.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{partner?.sector}</p>
                  </td>
                  <td className="px-6 py-3 max-w-xs">
                    <p className="text-slate-600 text-xs line-clamp-2">{r.message || '—'}</p>
                  </td>
                  <td className="px-6 py-3">{statusBadge(r.status)}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{formatDate(r.created_at)}</td>
                  <td className="px-6 py-3">
                    <IntroStatusSelect requestId={r.id} currentStatus={r.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
