import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

const STATUS_COLOURS: Record<string, { text: string; bg: string; border: string }> = {
  submitted:  { text: 'text-slate-600',   bg: 'bg-slate-50',    border: 'border-slate-200'   },
  approved:   { text: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  rejected:   { text: 'text-red-500',     bg: 'bg-red-50',      border: 'border-red-200'     },
  invited:    { text: 'text-sky-600',     bg: 'bg-sky-50',      border: 'border-sky-200'     },
  registered: { text: 'text-violet-600',  bg: 'bg-violet-50',   border: 'border-violet-200'  },
  matched:    { text: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200'   },
  intro_made: { text: 'text-orange-600',  bg: 'bg-orange-50',   border: 'border-orange-200'  },
  signed:     { text: 'text-teal-600',    bg: 'bg-teal-50',     border: 'border-teal-200'    },
  paid:       { text: 'text-brand-green', bg: 'bg-emerald-50',  border: 'border-emerald-300' },
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected',
  invited: 'Invited', registered: 'Registered', matched: 'Matched',
  intro_made: 'Intro Made', signed: 'Signed', paid: 'Paid',
}

export default async function IntroducerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const { data: leads } = await supabase
    .from('introducer_leads')
    .select('id, first_name, last_name, status, created_at')
    .eq('introducer_id', user!.id)
    .order('created_at', { ascending: false })

  const all = leads ?? []

  const counts = {
    submitted:  all.filter(l => l.status === 'submitted').length,
    approved:   all.filter(l => l.status === 'approved').length,
    invited:    all.filter(l => l.status === 'invited').length,
    registered: all.filter(l => l.status === 'registered').length,
    matched:    all.filter(l => l.status === 'matched').length,
    intro_made: all.filter(l => l.status === 'intro_made').length,
    signed:     all.filter(l => l.status === 'signed').length,
    paid:       all.filter(l => l.status === 'paid').length,
    rejected:   all.filter(l => l.status === 'rejected').length,
  }

  const recentLeads = all.slice(0, 5)

  return (
    <div>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="Your Franchise Foundry introducer dashboard."
      />

      {/* Pipeline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {(Object.entries(counts) as [string, number][]).filter(([k]) => k !== 'rejected').map(([status, count]) => {
          const c = STATUS_COLOURS[status] ?? STATUS_COLOURS.submitted
          return (
            <Link key={status} href="/introducer/leads">
              <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 hover:shadow-sm transition-shadow cursor-pointer`}>
                <p className={`text-2xl font-bold ${c.text} mb-0.5`}>{count}</p>
                <p className="text-xs font-medium text-slate-600">{STATUS_LABELS[status]}</p>
              </div>
            </Link>
          )
        })}
        {/* Rejected — muted */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-2xl font-bold text-slate-400 mb-0.5">{counts.rejected}</p>
          <p className="text-xs font-medium text-slate-400">Rejected</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Recent leads */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Recent leads</p>
            <Link href="/introducer/leads" className="text-xs text-brand-green hover:underline">View all →</Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-slate-400">No leads submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {recentLeads.map(lead => {
                const c = STATUS_COLOURS[lead.status] ?? STATUS_COLOURS.submitted
                return (
                  <div key={lead.id} className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800">{lead.first_name} {lead.last_name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Quick links */}
        <Card className="p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Quick actions</p>
          <div className="space-y-2">
            <Link href="/introducer/leads?new=1"
              className="flex items-center gap-2 px-4 py-3 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium rounded-xl transition-colors">
              <span>+</span> Submit a new lead
            </Link>
            <Link href="/introducer/commission"
              className="flex items-center gap-2 px-4 py-3 border border-slate-200 hover:border-brand-green text-slate-700 text-sm font-medium rounded-xl transition-colors">
              💰 View commission
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
