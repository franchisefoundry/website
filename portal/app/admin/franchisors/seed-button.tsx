'use client'

import { useState } from 'react'

type SeedResult = { brand: string; status: string }

export default function SeedFranchisorsButton() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SeedResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSeed() {
    if (!confirm('This will upsert all brands from the Franchise Foundry website into the portal. Existing brands will be updated with the latest data. Continue?')) return
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
        className="border border-line text-ink-2 text-sm font-medium px-4 py-2 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-60"
      >
        {loading ? 'Updating…' : 'Sync brands from website'}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {results && (
        <div className="mt-3 bg-white border border-line rounded-lg p-3 text-xs space-y-1 max-w-sm">
          <p className="font-medium text-ink-2 mb-2">Import results:</p>
          {results.map(r => (
            <div key={r.brand} className="flex justify-between gap-4">
              <span className="text-ink-2">{r.brand}</span>
              <span className={r.status === 'upserted' ? 'text-ff-green font-medium' : r.status.startsWith('error') ? 'text-red-500 font-medium' : 'text-ink-3'}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
