'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Agent = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

type Counts = { total: number; pending: number; active: number }

export default function AgentsTable({
  agents,
  countsByAgent,
}: {
  agents: Agent[]
  countsByAgent: Record<string, Counts>
}) {
  const router = useRouter()
  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirmId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/introducers/${confirmId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setConfirmId(null)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error')
    } finally {
      setDeleting(false)
    }
  }

  const confirmAgent = agents.find(a => a.id === confirmId)

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 text-xs">
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Mobile</th>
              <th className="text-left px-4 py-3 font-medium">Total leads</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Not invited</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Active</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => {
              const counts = countsByAgent[agent.id] ?? { total: 0, pending: 0, active: 0 }
              return (
                <tr key={agent.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{agent.full_name ?? '—'}</p>
                    <p className="text-xs text-slate-400 md:hidden">{agent.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{agent.email}</td>
                  <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{agent.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{counts.total}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {counts.pending > 0
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">{counts.pending}</span>
                      : <span className="text-slate-400">0</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{counts.active}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                    {new Date(agent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setConfirmId(agent.id); setDeleteError(null) }}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setConfirmId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-800 mb-2">Remove agent?</h3>
            <p className="text-sm text-slate-500 mb-1">
              This will permanently delete{' '}
              <span className="font-medium text-slate-700">{confirmAgent?.full_name ?? confirmAgent?.email}</span>
              &apos;s account and all their leads.
            </p>
            <p className="text-xs text-red-600 mb-5">This cannot be undone.</p>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
              >
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
