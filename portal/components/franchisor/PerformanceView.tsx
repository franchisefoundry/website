import { CountUp } from '@/components/ui/CountUp'
import { SparklesIcon } from '@/components/icons'

/** Presentational performance dashboard — shared by the real page and /design-preview. */
export function PerformanceView({ kpis, funnel }: {
  kpis: { n: number; l: string; suffix?: string }[]
  funnel: [string, number][]
}) {
  const fmax = Math.max(1, funnel[0]?.[1] ?? 1)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {kpis.map((k, i) => (
          <div key={k.l} className="rise bg-surface border border-line rounded-2xl px-4 py-4 shadow-[0_1px_2px_rgba(27,33,26,0.05)]" style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
            <p className="text-[28px] font-extrabold tracking-tight text-ink tabular-nums leading-none"><CountUp value={k.n} suffix={k.suffix ?? ''} /></p>
            <p className="text-[11px] text-ink-3 mt-1.5">{k.l}</p>
          </div>
        ))}
      </div>

      <div className="rise bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5 mb-4" style={{ animationDelay: '0.28s' }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3 mb-4">Recruitment funnel</p>
        {funnel.map(([label, value]) => (
          <div key={label} className="mb-3 last:mb-0">
            <div className="flex justify-between text-[12.5px] mb-1.5"><span className="text-ink-2">{label}</span><span className="font-bold text-ink tabular-nums">{value}</span></div>
            <div className="h-2 rounded-full bg-line overflow-hidden">
              <div className="h-full rounded-full bg-ff-green transition-all" style={{ width: `${Math.round((value / fmax) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="rise bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.05)] p-5 flex items-start gap-3" style={{ animationDelay: '0.34s' }}>
        <span className="w-9 h-9 rounded-xl bg-ff-gold-soft text-ff-gold-ink flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-4 h-4" /></span>
        <div>
          <p className="text-sm font-semibold text-ink">More insights coming soon</p>
          <p className="text-xs text-ink-2 mt-0.5">Profile views, candidate feedback, time-to-match and how you benchmark against the wider network.</p>
        </div>
      </div>
    </>
  )
}
