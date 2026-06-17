'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
        // Refresh clears the Next.js router cache so leads/franchisees
        // pages always show fresh data when navigated to
        router.refresh()
        if (data.franchiseeId) {
          router.push(`/admin/franchisees/${data.franchiseeId}`)
        } else {
          router.push('/admin/franchisees')
        }
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleConvert} fullWidth size="lg" disabled={loading}>
        {loading ? 'Converting…' : 'Convert & send invite'}
      </Button>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </>
  )
}
