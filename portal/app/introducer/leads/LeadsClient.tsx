'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SECTORS } from '@/lib/supabase/types'

// ── Types ──────────────────────────────────────────────────────────────────────

type Lead = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  location: string | null
  investment_min: number | null
  investment_max: number | null
  liquid_capital: number | null
  operator_model: string | null
  experience: string | null
  full_time_available: boolean | null
  timeline_months: number | null
  sectors: string[] | null
  goals: string | null
  source: string | null
  relationship: string | null
  introducer_notes: string | null
  status: string
  created_at: string
}

type FormState = {
  first_name: string; last_name: string; email: string; phone: string
  location: string
  investment_min: string; investment_max: string; liquid_capital: string
  operator_model: string; experience: string
  full_time_available: string
  timeline_months: string
  sectors: string[]
  goals: string
  source: string; relationship: string
  introducer_notes: string
}

const emptyForm: FormState = {
  first_name: '', last_name: '', email: '', phone: '',
  location: '',
  investment_min: '', investment_max: '', liquid_capital: '',
  operator_model: '', experience: '',
  full_time_available: '',
  timeline_months: '',
  sectors: [],
  goals: '',
  source: '', relationship: '',
  introducer_notes: '',
}

// ── Status helpers ─────────────────────────────────────────────────────────────

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

// ── UI atoms ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
    />
  )
}

function PillGroup({ options, value, onChange, multi = false }: {
  options: { value: string; label: string }[]
  value: string | string[]
  onChange: (v: string | string[]) => void
  multi?: boolean
}) {
  const selected = multi ? (value as string[]) : [value as string]
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => {
            if (multi) {
              const arr = value as string[]
              onChange(arr.includes(opt.value) ? arr.filter(v => v !== opt.value) : [...arr, opt.value])
            } else {
              onChange(value === opt.value ? '' : opt.value)
            }
          }}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
            selected.includes(opt.value)
              ? 'bg-brand-green text-white border-brand-green'
              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LeadsClient({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [notesLead, setNotesLead] = useState<Lead | null>(null)
  const [notesText, setNotesText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'complete'>('all')
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const filteredLeads = leads.filter(l => {
    if (filter === 'pending') return l.status === 'submitted'
    if (filter === 'active')  return ['invited', 'registered', 'matched', 'intro_made'].includes(l.status)
    if (filter === 'complete') return ['signed', 'paid'].includes(l.status)
    return true
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email) {
      setSubmitError('First name, last name and email are required.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/introducer/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          investment_min: form.investment_min ? parseInt(form.investment_min) : null,
          investment_max: form.investment_max ? parseInt(form.investment_max) : null,
          liquid_capital: form.liquid_capital ? parseInt(form.liquid_capital) : null,
          timeline_months: form.timeline_months ? parseInt(form.timeline_months) : null,
          full_time_available: form.full_time_available === 'true' ? true : form.full_time_available === 'false' ? false : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setForm(emptyForm)
      setShowForm(false)
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveNotes() {
    if (!notesLead) return
    setSavingNotes(true)
    try {
      await fetch(`/api/introducer/leads/${notesLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ introducer_notes: notesText }),
      })
      setNotesLead(null)
      router.refresh()
    } finally {
      setSavingNotes(false)
    }
  }

  async function handleSendInvite(lead: Lead) {
    setInvitingId(lead.id)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/introducer/leads/${lead.id}/invite`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send invite')
      setInviteLink(data.invite_link)
      router.refresh()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setInvitingId(null)
    }
  }

  const OPERATOR_OPTIONS = [
    { value: 'owner-operator', label: 'Owner-operator' },
    { value: 'hire-manager',   label: 'Hire a manager' },
    { value: 'either',         label: 'Either' },
  ]
  const EXPERIENCE_OPTIONS = [
    { value: 'none',           label: 'No experience needed' },
    { value: 'management',     label: 'Management' },
    { value: 'food-beverage',  label: 'F&B background' },
  ]
  const SOURCE_OPTIONS = [
    { value: 'LinkedIn',        label: 'LinkedIn' },
    { value: 'Event',           label: 'Event' },
    { value: 'Referral',        label: 'Referral' },
    { value: 'Cold outreach',   label: 'Cold outreach' },
    { value: 'Other',           label: 'Other' },
  ]
  const RELATIONSHIP_OPTIONS = [
    { value: 'Met once',            label: 'Met once' },
    { value: 'Ongoing conversation', label: 'Ongoing convo' },
    { value: 'Long-term contact',   label: 'Long-term contact' },
    { value: 'Other',               label: 'Other' },
  ]

  return (
    <div>
      {/* Filter tabs + button */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([
            { key: 'all',      label: `All (${leads.length})` },
            { key: 'pending',  label: 'Not yet invited' },
            { key: 'active',   label: 'Active' },
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
        <button
          onClick={() => setShowForm(true)}
          className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Submit new lead
        </button>
      </div>

      {submitError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">{submitError}</p>
      )}

      {/* Leads table */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-3xl mb-3">👥</div>
          <p className="text-slate-800 font-semibold text-sm mb-1">No leads yet</p>
          <p className="text-slate-400 text-xs">Submit your first lead to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 text-xs">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Location</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Budget</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{lead.first_name} {lead.last_name}</p>
                    <p className="text-xs text-slate-400">{lead.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{lead.location ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                    {lead.investment_min && lead.investment_max
                      ? `£${(lead.investment_min/1000).toFixed(0)}k – £${(lead.investment_max/1000).toFixed(0)}k`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOURS[lead.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden sm:table-cell">
                    {new Date(lead.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {lead.status === 'submitted' && (
                        <button
                          onClick={() => handleSendInvite(lead)}
                          disabled={invitingId === lead.id}
                          className="text-xs px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {invitingId === lead.id ? (
                            <>
                              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Sending…
                            </>
                          ) : 'Send invite'}
                        </button>
                      )}
                      <button
                        onClick={() => { setNotesLead(lead); setNotesText(lead.introducer_notes ?? '') }}
                        className="text-xs text-brand-green hover:underline"
                      >
                        Notes
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Invite link modal ────────────────────────────────────────────── */}
      {inviteLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setInviteLink(null); setInviteCopied(false) }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Invite link ready</h3>
            <p className="text-xs text-slate-400 mb-4">
              Copy and send this magic link directly to your lead. It will log them straight into the platform.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 break-all mb-4">
              {inviteLink}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink)
                setInviteCopied(true)
                setTimeout(() => setInviteCopied(false), 2000)
              }}
              className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors mb-2"
            >
              {inviteCopied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={() => { setInviteLink(null); setInviteCopied(false) }}
              className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Submit form slide-over ────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Submit new lead</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">

              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contact information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First name *">
                    <Input value={form.first_name} onChange={v => set('first_name', v)} placeholder="Jane" />
                  </Field>
                  <Field label="Last name *">
                    <Input value={form.last_name} onChange={v => set('last_name', v)} placeholder="Smith" />
                  </Field>
                  <Field label="Email *">
                    <Input value={form.email} onChange={v => set('email', v)} placeholder="jane@example.com" type="email" />
                  </Field>
                  <Field label="Phone">
                    <Input value={form.phone} onChange={v => set('phone', v)} placeholder="+44 7700 900000" />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Location">
                    <Input value={form.location} onChange={v => set('location', v)} placeholder="e.g. Manchester" />
                  </Field>
                </div>
              </div>

              {/* Investment */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Investment</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Min budget (£)">
                    <Input value={form.investment_min} onChange={v => set('investment_min', v)} placeholder="50000" type="number" />
                  </Field>
                  <Field label="Max budget (£)">
                    <Input value={form.investment_max} onChange={v => set('investment_max', v)} placeholder="150000" type="number" />
                  </Field>
                  <Field label="Liquid capital (£)">
                    <Input value={form.liquid_capital} onChange={v => set('liquid_capital', v)} placeholder="30000" type="number" />
                  </Field>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preferences</p>
                <Field label="Operator model">
                  <PillGroup options={OPERATOR_OPTIONS} value={form.operator_model} onChange={v => set('operator_model', v as string)} />
                </Field>
                <Field label="Experience level">
                  <PillGroup options={EXPERIENCE_OPTIONS} value={form.experience} onChange={v => set('experience', v as string)} />
                </Field>
                <Field label="Full-time available?">
                  <PillGroup
                    options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
                    value={form.full_time_available}
                    onChange={v => set('full_time_available', v as string)}
                  />
                </Field>
                <Field label="Timeline to open (months)">
                  <Input value={form.timeline_months} onChange={v => set('timeline_months', v)} placeholder="e.g. 6" type="number" />
                </Field>
                <Field label="Sectors of interest">
                  <PillGroup
                    options={SECTORS.map(s => ({ value: s.value, label: s.label }))}
                    value={form.sectors}
                    onChange={v => set('sectors', v as string[])}
                    multi
                  />
                </Field>
                <Field label="Goals / motivations">
                  <textarea
                    value={form.goals}
                    onChange={e => set('goals', e.target.value)}
                    rows={3}
                    placeholder="What drives them — financial freedom, leaving employment, passion for the sector…"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
                  />
                </Field>
              </div>

              {/* Introducer context */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">How you found them</p>
                <Field label="Source">
                  <PillGroup options={SOURCE_OPTIONS} value={form.source} onChange={v => set('source', v as string)} />
                </Field>
                <Field label="Relationship">
                  <PillGroup options={RELATIONSHIP_OPTIONS} value={form.relationship} onChange={v => set('relationship', v as string)} />
                </Field>
                <Field label="Your notes (private — only you and the FF team see these)">
                  <textarea
                    value={form.introducer_notes}
                    onChange={e => set('introducer_notes', e.target.value)}
                    rows={3}
                    placeholder="Anything else the team should know about this person…"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
                  />
                </Field>
              </div>

              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{submitError}</p>
              )}

              <div className="flex gap-3 pt-2 pb-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit lead →'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 border border-slate-300 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Notes modal ──────────────────────────────────────────────────── */}
      {notesLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setNotesLead(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-1">Notes for {notesLead.first_name} {notesLead.last_name}</h3>
            <p className="text-xs text-slate-400 mb-4">Private — only you and the FF team can see these.</p>
            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none mb-4"
              placeholder="Add your notes here…"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {savingNotes ? 'Saving…' : 'Save notes'}
              </button>
              <button
                onClick={() => setNotesLead(null)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
