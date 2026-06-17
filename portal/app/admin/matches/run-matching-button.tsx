'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
      <Button onClick={handleRun} disabled={loading}>
        {loading ? 'Running…' : 'Run matching'}
      </Button>
    </div>
  )
}
