import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import Link from 'next/link'
import type { Lead } from '@/lib/supabase/types'
import DeleteLeadButton from './DeleteLeadButton'

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  meeting_requested: 'bg-amber-50 text-amber-700',
  converted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-slate-100 text-slate-500',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  meeting_requested: 'Meeting requested',
  converted: 'Converted',
  rejected: 'Rejected',
}

export default async function AdminLeadsPage() {
  const admin = createAdminClient()

  const { data: leads } = await admin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  const typedLeads = (leads ?? []) as Lead[]

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Quiz submissions from the public matching form."
      />

      {typedLeads.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No leads yet. Share the <strong className="text-slate-600">/get-matched</strong> link to start collecting.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Budget</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {typedLeads.map(lead => (
                <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{lead.full_name}</td>
                  <td className="px-4 py-3 text-slate-500">{lead.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {lead.investment_min && lead.investment_max
                      ? `£${lead.investment_min.toLocaleString()} – £${lead.investment_max.toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/leads/${lead.id}`} className="text-brand-green text-xs font-medium hover:underline">
                        View →
                      </Link>
                      <DeleteLeadButton leadId={lead.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
