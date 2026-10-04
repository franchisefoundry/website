export interface PipelineCard {
  id: string
  name: string
  score: number
  scoreCls: string
  budget: string
}

const COLUMNS = [
  { id: 'matched', label: 'Matched', dot: 'var(--ff-ink-3)' },
  { id: 'interested', label: 'Interested', dot: 'var(--ff-ok)' },
  { id: 'intro', label: 'Intro made', dot: 'var(--ff-gold)' },
  { id: 'meeting', label: 'Meeting', dot: '#2563eb' },
  { id: 'agreement', label: 'Agreement', dot: 'var(--ff-green)' },
] as const

/** Presentational pipeline board — shared by the real page and /design-preview. */
export function PipelineBoard({ byStage }: { byStage: Record<string, PipelineCard[]> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {COLUMNS.map(col => (
        <div key={col.id} className="rise">
          <div className="flex items-center gap-2 mb-2.5 px-1">
            <span className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">{col.label}</span>
            <span className="text-[11px] text-ink-3 tabular-nums ml-auto">{byStage[col.id]?.length ?? 0}</span>
          </div>
          <div className="space-y-2 min-h-[60px]">
            {(byStage[col.id] ?? []).map(c => (
              <div key={c.id} className="bg-surface border border-line rounded-xl p-3 shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink truncate">{c.name}</span>
                  {c.score > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.scoreCls}`}>{c.score}%</span>}
                </div>
                <p className="text-[11px] text-ink-3 mt-1 tabular-nums">{c.budget}</p>
              </div>
            ))}
            {(byStage[col.id]?.length ?? 0) === 0 && <div className="border border-dashed border-line-2 rounded-xl h-14" />}
          </div>
        </div>
      ))}
    </div>
  )
}
