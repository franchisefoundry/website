import { Section } from '@/components/crm/Section'
import { formatDate, timeAgo } from '@/lib/utils'
import { CheckIcon } from '@/components/icons'

export interface AgreementInfo {
  id?: string
  status: string | null
  sent_at?: string | null
  signed_at?: string | null
  signer_name?: string | null
  signed_pdf_path?: string | null
}

function statusPill(status: string) {
  if (status === 'signed') return <span className="inline-flex items-center text-xs font-medium text-ff-green bg-ff-green-soft border border-ff-green/20 px-2.5 py-0.5 rounded-full">Signed</span>
  if (status === 'sent') return <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">Awaiting signature</span>
  return <span className="inline-flex items-center text-xs font-medium text-ink-3 bg-surface-2 border border-line px-2.5 py-0.5 rounded-full">Not sent</span>
}

/** Agreement detail on a brand record — status, sent/signed timeline, download,
 *  and the comments slot. Sending/resending stays in the record header action. */
export function AgreementSection({ agreement }: { agreement: AgreementInfo | null }) {
  const status = agreement?.status ?? 'not_sent'
  const steps = [
    { label: 'Sent', done: !!agreement?.sent_at, date: agreement?.sent_at },
    { label: 'Signed', done: status === 'signed', date: agreement?.signed_at },
  ]

  return (
    <Section title="Franchise agreement" right={statusPill(status)}>
      {status === 'not_sent' ? (
        <p className="text-sm text-ink-3">No agreement sent yet. Use <span className="font-medium text-ink-2">Send agreement</span> above to send the current template for signature.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-8 mb-4">
            {steps.map(s => (
              <div key={s.label} className="flex items-center gap-2.5">
                <span className={`w-6 h-6 rounded-full grid place-items-center flex-shrink-0 ${s.done ? 'bg-ff-green text-white' : 'bg-surface-2 text-ink-3 border border-line'}`}>
                  {s.done ? <CheckIcon className="w-3.5 h-3.5" /> : ''}
                </span>
                <div>
                  <p className="text-xs font-semibold text-ink">{s.label}</p>
                  <p className="text-[11px] text-ink-3">{s.date ? formatDate(s.date) : '—'}</p>
                </div>
              </div>
            ))}
          </div>

          {status === 'signed' && agreement?.signer_name && (
            <p className="text-sm text-ink-2 mb-4">
              Signed by <span className="font-semibold text-ink">{agreement.signer_name}</span>
              {agreement.signed_at && <span className="text-ink-3"> · {timeAgo(agreement.signed_at)}</span>}
            </p>
          )}

          {status === 'signed' && agreement?.signed_pdf_path && agreement.id && (
            <a href={`/api/admin/agreements/download/${agreement.id}`} className="inline-flex items-center text-sm font-medium text-ff-green hover:underline">
              Download signed PDF →
            </a>
          )}
        </>
      )}

      {/* Comments — the brand's queries on the agreement */}
      <div className="mt-5 pt-4 border-t border-line-2">
        <p className="text-[10px] font-bold text-ink-3 uppercase tracking-wide mb-2">Comments</p>
        <p className="text-xs text-ink-3">No comments yet. Queries the brand raises on the agreement will appear here once the e-signature review flow is live.</p>
      </div>
    </Section>
  )
}
