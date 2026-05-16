'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import type { FranchiseeProfile } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  franchisee: FranchiseeProfile
}

export default function FranchiseeActions({ franchisee }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function updateStatus(status: string) {
    setLoading(status)
    const supabase = createClient()
    await supabase
      .from('franchisee_profiles')
      .update({ status, ...(status === 'signed' ? { signed_at: new Date().toISOString() } : {}) })
      .eq('id', franchisee.id)
    setLoading(null)
    router.refresh()
  }

  async function toggleTier2() {
    setLoading('tier2')
    const supabase = createClient()
    await supabase
      .from('franchisee_profiles')
      .update({ tier_2_unlocked: !franchisee.tier_2_unlocked })
      .eq('id', franchisee.id)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Status</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {['active', 'signed', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={franchisee.status === s || loading !== null}
              className="w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                border-slate-200 text-slate-700 hover:bg-slate-50 data-[active=true]:bg-brand-green data-[active=true]:text-white data-[active=true]:border-brand-green"
              data-active={franchisee.status === s}
            >
              {loading === s ? 'Saving…' : (
                <span className="capitalize">{s.replace('_', ' ')}</span>
              )}
            </button>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Marketplace access</CardTitle></CardHeader>
        <CardBody>
          <p className="text-xs text-slate-500 mb-3">
            {franchisee.tier_2_unlocked
              ? 'Marketplace is unlocked — franchisee can browse partners and request intros.'
              : 'Unlock to give this franchisee access to the partner marketplace.'}
          </p>
          <button
            onClick={toggleTier2}
            disabled={loading === 'tier2'}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              franchisee.tier_2_unlocked
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-brand-green text-white hover:bg-brand-green-dark'
            }`}
          >
            {loading === 'tier2' ? 'Saving…' : franchisee.tier_2_unlocked ? '🔒 Lock marketplace' : '🔓 Unlock marketplace'}
          </button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardBody className="text-sm space-y-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(franchisee as any).profiles?.email && (
            <a
              href={`mailto:${(franchisee as any).profiles.email}`}
              className="block text-brand-green hover:underline truncate"
            >
              {(franchisee as any).profiles.email}
            </a>
          )}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(franchisee as any).profiles?.phone && (
            <p className="text-slate-600">{(franchisee as any).profiles.phone}</p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
