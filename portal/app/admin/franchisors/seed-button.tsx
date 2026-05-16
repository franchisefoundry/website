'use client'

import { useState } from 'react'

type SeedResult = { brand: string; status: string }

export default function SeedFranchisorsButton() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SeedResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSeed() {
    if (!confirm('This will import all brands from the Franchise Foundry website into the portal. Existing brands (matched by slug) will be skipped. Continue?')) return
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const res = await fetch('/api/admin/seed-franchisors', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleSeed}
        disabled={loading}
        className="border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
      >
        {loading ? 'Importing…' : 'Import from website'}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {results && (
        <div className="mt-3 bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1 max-w-sm">
          <p className="font-medium text-slate-700 mb-2">Import results:</p>
          {results.map(r => (
            <div key={r.brand} className="flex justify-between gap-4">
              <span className="text-slate-600">{r.brand}</span>
              <span className={r.status === 'created' ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
