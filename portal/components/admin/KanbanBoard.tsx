import Link from 'next/link'

export interface KanbanColumn {
  key: string
  label: string
  /** CSS colour for the column dot (e.g. 'var(--ff-green)' or '#2563eb'). */
  dot?: string
}

/** Generic Kanban board for admin CRM lists. Server component — pass render
 *  functions from a server page. Cards are click-through (no inline actions). */
export function KanbanBoard<T extends { id: string }>({
  columns, items, groupBy, renderCard, hrefFor,
}: {
  columns: KanbanColumn[]
  items: T[]
  groupBy: (item: T) => string
  renderCard: (item: T) => React.ReactNode
  hrefFor?: (item: T) => string
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))` }}>
        {columns.map(col => {
          const colItems = items.filter(i => groupBy(i) === col.key)
          return (
            <div key={col.key}>
              <div className="flex items-center gap-2 mb-2.5 px-1">
                <span className="w-2 h-2 rounded-full" style={{ background: col.dot ?? 'var(--ff-ink-3)' }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">{col.label}</span>
                <span className="text-[11px] text-ink-3 tabular-nums ml-auto">{colItems.length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {colItems.map(item => {
                  const card = (
                    <div className="bg-surface border border-line rounded-xl p-3 shadow-[0_1px_2px_rgba(27,33,26,0.04)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(27,33,26,0.07)] hover:border-[#d6dace] transition-all">
                      {renderCard(item)}
                    </div>
                  )
                  return hrefFor ? <Link key={item.id} href={hrefFor(item)} className="block">{card}</Link> : <div key={item.id}>{card}</div>
                })}
                {colItems.length === 0 && <div className="border border-dashed border-line-2 rounded-xl h-14" />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
