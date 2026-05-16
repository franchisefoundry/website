'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteLeadButton({ leadId, redirectAfter = false }: { leadId: string; redirectAfter?: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Could not delete lead.')
        return
      }
      if (redirectAfter) {
        router.push('/admin/leads')
      } else {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-500 text-xs font-medium hover:text-red-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  )
}
