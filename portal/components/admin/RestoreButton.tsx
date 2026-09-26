'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RestoreButton({ type, id }: { type: 'franchisees' | 'franchisors' | 'introducers'; id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  async function restore() {
    setLoading(true)
    const res = await fetch('/api/admin/restore', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    })
    setLoading(false)
    if (res.ok) router.refresh()
    else alert('Could not restore this record.')
  }
  return (
    <button onClick={restore} disabled={loading}
      className="text-xs font-medium text-ff-green hover:underline disabled:opacity-60">
      {loading ? 'Restoring…' : 'Restore'}
    </button>
  )
}
