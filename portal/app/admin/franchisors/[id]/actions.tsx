'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import type { FranchisorProfile } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  franchisor: FranchisorProfile
}

export default function FranchisorStatusActions({ franchisor }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [notes, setNotes] = useState(franchisor.admin_notes ?? '')

  async function updateStatus(status: string) {
    setLoading(status)
    const supabase = createClient()
    await supabase
      .from('franchisor_profiles')
      .update({ status })
      .eq('id', franchisor.id)
    setLoading(null)
    router.refresh()
  }

  async function saveNotes() {
    setLoading('notes')
    const supabase = createClient()
    await supabase
      .from('franchisor_profiles')
      .update({ admin_notes: notes })
      .eq('id', franchisor.id)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Profile status</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {['draft', 'pending_review', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={franchisor.status === s || loading !== null}
              className="w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                border-slate-200 text-slate-700 hover:bg-slate-50 data-[active=true]:bg-brand-green data-[active=true]:text-white data-[active=true]:border-brand-green"
              data-active={franchisor.status === s}
            >
              {loading === s ? 'Saving…' : (
                <span className="capitalize">{s.replace('_', ' ')}</span>
              )}
            </button>
          ))}
          <p className="text-xs text-slate-400 pt-1">
            Set to <strong>Active</strong> to make this brand available for matching.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Admin notes</CardTitle></CardHeader>
        <CardBody>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Internal notes about this brand or relationship…"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none"
          />
          <button
            onClick={saveNotes}
            disabled={loading === 'notes'}
            className="mt-2 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {loading === 'notes' ? 'Saving…' : 'Save notes'}
          </button>
        </CardBody>
      </Card>
    </div>
  )
}
