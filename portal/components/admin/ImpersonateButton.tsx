'use client'

import { useState } from 'react'

interface Props {
  userId: string
  redirectTo: string
  label?: string
}

export function ImpersonateButton({ userId, redirectTo, label }: Props) {
  const [loading, setLoading] = useState(false)

  async function impersonate() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, redirectTo }),
      })
      const data = await res.json()
      if (data.link) {
        window.open(data.link, '_blank', 'noopener,noreferrer')
      } else {
        alert(`Impersonation failed: ${data.error ?? 'Unknown error'}`)
      }
    } catch {
      alert('Impersonation request failed')
    }
    setLoading(false)
  }

  return (
    <button
      onClick={impersonate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {loading ? (
        <>
          <span className="animate-spin text-[10px]">⟳</span> Opening…
        </>
      ) : (
        <>
          <span>👁</span> {label ?? 'View as user →'}
        </>
      )}
    </button>
  )
}
