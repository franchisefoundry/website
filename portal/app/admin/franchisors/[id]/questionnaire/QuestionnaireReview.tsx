'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SectionRow, QuestionRow } from '@/app/admin/questionnaire-template/page'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'

interface Props {
  franchisorId: string
  status: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existing: Record<string, any> | null
  sections: SectionRow[]
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:          { label: 'Draft',           cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_review: { label: 'Pending review',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  active:         { label: 'Approved · live', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  needs_info:     { label: 'More info needed', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  rejected:       { label: 'Rejected',        cls: 'bg-red-50 text-red-600 border-red-200' },
  inactive:       { label: 'Inactive',        cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const FORMAT_LABELS: Record<string, string> = { 'dine-in': 'Dine-in', takeaway: 'Takeaway', kiosk: 'Kiosk', delivery: 'Delivery', flexible: 'Flexible' }
const EXPERIENCE_LABELS: Record<string, string> = { none: 'No prior experience required', management: 'Management experience preferred', 'food-beverage': 'Food & beverage background needed' }

function money(v: unknown): string {
  if (v == null || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? `£${n.toLocaleString()}` : '—'
}
function yesNo(v: unknown): string {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return '—'
}

export default function QuestionnaireReview({ franchisorId, status: initialStatus, existing, sections }: Props) {
  const e = existing ?? {}
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState<string | null>(null)

  const questionTexts: Record<string, string> = Object.fromEntries(
    sections.flatMap(s => s.questions).map(q => [q.field_key, q.question_text])
  )
  const customQuestions = sections.flatMap(s => s.questions).filter(q => q.field_key.startsWith('custom_'))
  const label = (key: string, fallback: string) => questionTexts[key] ?? fallback

  async function decide(decision: 'approve' | 'request_info' | 'reject') {
    setLoading(decision)
    const res = await fetch(`/api/admin/franchisors/${franchisorId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    setLoading(null)
    if (res.ok) {
      const { status: newStatus } = await res.json()
      setStatus(newStatus)
      toast(decision === 'approve' ? 'Approved — brand is now live in matching' : decision === 'reject' ? 'Brand rejected' : 'Marked as needing more info')
      router.refresh()
    } else {
      toast('Could not update — please try again', 'error')
    }
  }

  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft

  // ── Read-only field renderers ───────────────────────────────────────────────
  function Field({ label: l, children }: { label: string; children: React.ReactNode }) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1">{l}</p>
        <div className="text-sm text-slate-800">{children}</div>
      </div>
    )
  }
  function Text({ value }: { value: unknown }) {
    const s = typeof value === 'string' ? value.trim() : value != null ? String(value) : ''
    return s ? <p className="whitespace-pre-wrap leading-relaxed">{s}</p> : <span className="text-slate-300">—</span>
  }
  function Chips({ values, labels }: { values: unknown; labels?: Record<string, string> }) {
    const arr = Array.isArray(values) ? values : []
    if (!arr.length) return <span className="text-slate-300">—</span>
    return (
      <div className="flex flex-wrap gap-1.5">
        {arr.map((v, i) => (
          <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-700 capitalize">
            {labels?.[String(v)] ?? String(v)}
          </span>
        ))}
      </div>
    )
  }
  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <p className="text-sm font-semibold text-slate-800">{title}</p>
        </div>
        <div className="px-5 py-4 space-y-4">{children}</div>
      </div>
    )
  }

  function renderCustom(cq: QuestionRow) {
    const val = (e.custom_answers ?? {})[cq.field_key]
    if (cq.input_type === 'multiselect') return <Field label={cq.question_text}><Chips values={val} /></Field>
    if (cq.input_type === 'yes_no') return <Field label={cq.question_text}><Text value={yesNo(val)} /></Field>
    if (cq.input_type === 'rating') return <Field label={cq.question_text}><Text value={val ? `${val} / 10` : ''} /></Field>
    return <Field label={cq.question_text}><Text value={val} /></Field>
  }

  return (
    <div className="space-y-3">
      {/* ── Decision panel ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800">Review decision</p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Answers are managed by the franchisor and can&apos;t be edited here. Choose an outcome to set the matching status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={loading !== null} onClick={() => decide('request_info')}>
              {loading === 'request_info' ? '…' : 'Request info'}
            </Button>
            <Button size="sm" variant="danger" disabled={loading !== null} onClick={() => decide('reject')}>
              {loading === 'reject' ? '…' : 'Reject'}
            </Button>
            <Button size="sm" disabled={loading !== null} onClick={() => decide('approve')}>
              {loading === 'approve' ? '…' : 'Approve'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Read-only answers ──────────────────────────────────────────── */}
      <Section title="1 · The Business">
        <Field label={label('core_model', 'Core business model & day-to-day operations')}><Text value={e.core_model} /></Field>
        <Field label={label('competitive_advantage', 'Competitive advantage')}><Text value={e.competitive_advantage} /></Field>
        <Field label={label('high_performing_unit', 'High-performing unit')}><Text value={e.high_performing_unit} /></Field>
        <Field label={label('underperformance_reasons', 'Common reasons for underperformance')}><Text value={e.underperformance_reasons} /></Field>
      </Section>

      <Section title="2 · Financials">
        <Field label="Total investment range"><Text value={`${money(e.investment_min)} – ${money(e.investment_max)}`} /></Field>
        <Field label="Minimum liquid capital"><Text value={money(e.liquid_capital_min)} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Franchise fee"><Text value={money(e.franchise_fee)} /></Field>
          <Field label="Royalty"><Text value={e.royalty_pct != null ? `${e.royalty_pct}%` : ''} /></Field>
          <Field label="Marketing levy"><Text value={e.marketing_levy_pct != null ? `${e.marketing_levy_pct}%` : ''} /></Field>
        </div>
        <Field label={label('financial_metrics_shared', 'Financial data shared with prospects')}><Text value={e.financial_metrics_shared} /></Field>
        <Field label="Typical break-even timeline"><Text value={e.break_even_months ? `${e.break_even_months} months` : ''} /></Field>
        <Field label={label('common_objections', 'Common financial objections')}><Text value={e.common_objections} /></Field>
      </Section>

      <Section title="3 · Ideal Franchisee">
        <Field label={label('ideal_franchisee_profile', 'Ideal franchisee profile')}><Text value={e.ideal_franchisee_profile} /></Field>
        <Field label="Minimum experience required"><Text value={e.experience_required ? (EXPERIENCE_LABELS[e.experience_required] ?? e.experience_required) : ''} /></Field>
        <Field label="Full-time commitment required?"><Text value={yesNo(e.full_time_required)} /></Field>
        <Field label={label('approval_factors', 'Top approval factors')}><Chips values={e.approval_factors} /></Field>
        <Field label="Single-location licences granted?"><Text value={yesNo(e.single_franchise_licenses)} /></Field>
        <Field label="Operating model"><Text value={e.operating_model_raw} /></Field>
        <Field label={label('decline_reasons', 'Common decline reasons')}><Chips values={e.decline_reasons} /></Field>
      </Section>

      <Section title="4 · Growth & Territory">
        <Field label="Franchise formats"><Chips values={e.format_types} labels={FORMAT_LABELS} /></Field>
        <Field label="Active UK territories"><Chips values={e.locations_available} /></Field>
        <Field label="Annual unit target"><Text value={e.growth_target_units ? `${e.growth_target_units} units/year` : ''} /></Field>
        <Field label="Growth context & timeframe"><Text value={e.annual_growth_targets} /></Field>
        <Field label={label('priority_territories', 'Priority UK territories')}><Text value={e.priority_territories} /></Field>
        <Field label={label('scaling_concerns', 'Biggest scaling concern')}><Text value={e.scaling_concerns} /></Field>
        <Field label="Months from inquiry to opening"><Text value={e.timeline_months ? `${e.timeline_months} months` : ''} /></Field>
      </Section>

      <Section title="5 · Recruitment Process">
        <Field label={label('inquiry_channels', 'Where enquiries come from')}><Chips values={e.inquiry_channels} /></Field>
        <Field label="Screening process steps">
          {Array.isArray(e.screening_steps) && e.screening_steps.length
            ? <ol className="list-decimal list-inside space-y-0.5">{e.screening_steps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
            : <Text value={e.screening_method} />}
        </Field>
        <Field label={label('approval_timing', 'When approval decision is made')}><Text value={e.approval_timing} /></Field>
        <Field label={label('approval_authority', 'Final sign-off authority')}><Text value={e.approval_authority} /></Field>
        <Field label={label('timeline_inquiry_to_contract', 'Timeline: enquiry to contract')}><Text value={e.timeline_inquiry_to_contract} /></Field>
        <Field label={label('post_signing_activities', 'Post-signing onboarding')}><Text value={e.post_signing_activities} /></Field>
        <Field label={label('timeline_signing_to_launch', 'Timeline: signing to opening')}><Text value={e.timeline_signing_to_launch} /></Field>
        <Field label={label('process_bottlenecks', 'Biggest recruitment bottlenecks')}><Text value={e.process_bottlenecks} /></Field>
        <Field label="Recruitment process self-rating"><Text value={e.recruitment_process_rating ? `${e.recruitment_process_rating} / 10` : ''} /></Field>
      </Section>

      {customQuestions.length > 0 && (
        <Section title="Additional Questions">
          {customQuestions.map(cq => <div key={cq.field_key}>{renderCustom(cq)}</div>)}
        </Section>
      )}
    </div>
  )
}
