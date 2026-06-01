'use client'

import { useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lead = any

const STATUS_COLOURS: Record<string, string> = {
  submitted:  'bg-slate-100 text-slate-600',
  invited:    'bg-sky-50 text-sky-700',
  registered: 'bg-violet-50 text-violet-700',
  matched:    'bg-amber-50 text-amber-700',
  intro_made: 'bg-orange-50 text-orange-700',
  signed:     'bg-teal-50 text-teal-700',
  paid:       'bg-green-50 text-green-700',
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted', invited: 'Invited', registered: 'Registered',
  matched: 'Matched', intro_made: 'Intro Made', signed: 'Signed', paid: 'Paid',
}

export default function IntroducerLeadsClient({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'complete'>('all')
  const [notesLead, setNotesLead] = useState<Lead | null>(null)

  const filtered = leads.filter(l => {
    if (filter === 'pending')  return l.status === 'submitted'
    if (filter === 'active')   return ['invited', 'registered', 'matched', 'intro_made'].includes(l.status)
    if (filter === 'complete') return ['signed', 'paid'].includes(l.status)
    return true
  })

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        {([
          { key: 'all',     label: `All (${leads.length})` },
          { key: 'pending', label: `Not yet invited (${leads.filter((l: Lead) => l.status === 'submitted').length})` },
          { key: 'active',  label: 'Active' },
          { key: 'complete', label: 'Complete' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">No leads in this category.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">Introducer</th>
                <th className="text-left px-4 py-3 font-medium">Lead</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Budget</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Submitted</th>
                <th className="px-4 py-3 font-medium text-right">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead: Lead) => (
                <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-slate-700">{lead.profiles?.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{lead.profiles?.email ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-slate-400">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                    {lead.investment_min && lead.investment_max
                      ? `£${(lead.investment_min/1000).toFixed(0)}k–£${(lead.investment_max/1000).toFixed(0)}k`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{lead.source ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[lead.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                    {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {lead.introducer_notes && (
                      <button
                        onClick={() => setNotesLead(lead)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                        title="View notes"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes modal */}
      {notesLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setNotesLead(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Introducer notes</h3>
            <p className="text-xs text-slate-400 mb-3">{notesLead.first_name} {notesLead.last_name}</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{notesLead.introducer_notes}</p>
            <button
              onClick={() => setNotesLead(null)}
              className="mt-4 w-full px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
