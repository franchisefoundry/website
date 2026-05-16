'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConvertButton({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleConvert() {
    if (!confirm('Send portal invite and create franchisee profile from this lead?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/convert`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleConvert}
        disabled={loading}
        className="w-full bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
      >
        {loading ? 'Converting…' : 'Convert & send invite'}
      </button>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </>
  )
}
