import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'

export default async function CommissionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: commissions } = await supabase
    .from('introducer_commissions')
    .select('*, introducer_leads(first_name, last_name)')
    .eq('introducer_id', user!.id)
    .order('created_at', { ascending: false })

  const all = commissions ?? []
  const totalEarned  = all.filter(c => c.status === 'paid').reduce((s, c) => s + (c.commission_amount ?? 0), 0)
  const totalPending = all.filter(c => c.status !== 'paid').reduce((s, c) => s + (c.commission_amount ?? 0), 0)
  const totalDue     = all.filter(c => c.status === 'due').reduce((s, c) => s + (c.commission_amount ?? 0), 0)

  const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    due:     'bg-amber-50 text-amber-700',
    paid:    'bg-emerald-50 text-emerald-700',
  }

  return (
    <div>
      <PageHeader
        title="Commission"
        description="Track your earnings and upcoming payouts."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total earned', amount: totalEarned,  colour: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Due next month', amount: totalDue,   colour: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200'   },
          { label: 'Pending',        amount: totalPending, colour: 'text-slate-600', bg: 'bg-slate-50',   border: 'border-slate-200'   },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-5`}>
            <p className={`text-2xl font-bold ${s.colour} mb-0.5`}>
              £{(s.amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Commission explainer */}
      <Card className="p-5 mb-6 bg-slate-50 border-slate-200">
        <p className="text-sm font-semibold text-slate-700 mb-1">How commission works</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          You earn 20% of the fee Franchise Foundry receives from the franchisor when a franchise agreement is signed.
          Your commission is paid in the calendar month after we receive payment.
        </p>
      </Card>

      {/* Commission table */}
      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-3xl mb-3">💰</div>
          <p className="text-slate-800 font-semibold text-sm mb-1">No commissions yet</p>
          <p className="text-slate-400 text-xs">Commission records appear when a lead signs a franchise agreement.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">Lead</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">FF Fee</th>
                <th className="text-left px-4 py-3 font-medium">Your commission</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Due date</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {all.map(c => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const lead = c.introducer_leads as any
                return (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {lead ? `${lead.first_name} ${lead.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {c.ff_fee_amount ? `£${(c.ff_fee_amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {c.commission_amount ? `£${(c.commission_amount / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {c.commission_due_date
                        ? new Date(c.commission_due_date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[c.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {c.status === 'paid' ? 'Paid' : c.status === 'due' ? 'Due' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
