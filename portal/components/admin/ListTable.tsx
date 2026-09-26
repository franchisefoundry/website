import Link from 'next/link'
import { ArrowRightIcon } from '@/components/icons'

export interface ListColumn<T> {
  header: string
  cell: (row: T) => React.ReactNode
  /** Extra classes for the cell (e.g. responsive hiding). */
  className?: string
}

/** Generic table view for admin CRM lists. Server component — pass render
 *  functions from a server page. Each row links to its record via hrefFor. */
export function ListTable<T extends { id: string }>({
  columns, rows, hrefFor,
}: {
  columns: ListColumn<T>[]
  rows: T[]
  hrefFor?: (row: T) => string
}) {
  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(27,33,26,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 border-b border-line">
            <tr className="text-ink-3 text-[11px] uppercase tracking-wide">
              {columns.map((c, i) => <th key={i} className={`text-left px-4 py-2.5 font-medium ${c.className ?? ''}`}>{c.header}</th>)}
              {hrefFor && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-2">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-surface-2/60 transition-colors">
                {columns.map((c, i) => <td key={i} className={`px-4 py-3 ${c.className ?? ''}`}>{c.cell(row)}</td>)}
                {hrefFor && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link href={hrefFor(row)} className="text-xs font-medium text-ff-green hover:underline inline-flex items-center gap-0.5">View <ArrowRightIcon className="w-3 h-3" /></Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
