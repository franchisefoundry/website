'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RunMatchingButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const router = useRouter()

  async function handleRun() {
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/admin/run-matching', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setResult(`${data.created} new matches scored.`)
      router.refresh()
    } else {
      setResult('Something went wrong.')
    }
    setTimeout(() => setResult(null), 4000)
  }

  return (
    <div className="flex items-center gap-3">
      {result && <span className="text-sm text-slate-500">{result}</span>}
      <button
        onClick={handleRun}
        disabled={loading}
        className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
      >
        {loading ? 'Running…' : 'Run matching'}
      </button>
    </div>
  )
}
