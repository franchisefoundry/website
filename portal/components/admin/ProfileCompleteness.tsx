import Link from 'next/link'
import { Section } from '@/components/crm/Section'
import type { Completeness } from '@/lib/profile-completeness'

/**
 * "What's missing" card for a franchisee or brand record. Shows the completion
 * bar plus a chip per missing field, with an optional link to fix it.
 */
export function ProfileCompleteness({ data, editHref }: { data: Completeness; editHref?: string }) {
  const complete = data.missing.length === 0
  return (
    <Section
      title="Profile completeness"
      right={<span className={`text-xs font-semibold tabular-nums ${complete ? 'text-ff-green' : 'text-ink-2'}`}>{data.pct}%</span>}
    >
      <div className="h-1.5 rounded-full bg-line overflow-hidden mb-3">
        <div className={`h-full rounded-full ${complete ? 'bg-ff-green' : 'bg-ff-gold'}`} style={{ width: `${data.pct}%` }} />
      </div>
      {complete ? (
        <p className="text-sm text-ink-2">Everything&apos;s filled in.</p>
      ) : (
        <>
          <p className="text-xs text-ink-3 mb-2">Missing ({data.missing.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {data.missing.map(m => (
              <span key={m} className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">{m}</span>
            ))}
          </div>
          {editHref && (
            <Link href={editHref} className="inline-block mt-3 text-sm font-medium text-ff-green hover:underline">Fill in missing details →</Link>
          )}
        </>
      )}
    </Section>
  )
}
