'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import type { FranchiseeProfile } from '@/lib/supabase/types'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

interface FranchisorOption {
  id: string
  brand_name: string | null
  category: string | null
}

interface Props {
  franchisee: FranchiseeProfile
  franchisors: FranchisorOption[]
  assignedFranchisor?: FranchisorOption | null
}

export default function FranchiseeActions({ franchisee, franchisors, assignedFranchisor }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [pipelineStage, setPipelineStage] = useState(franchisee.pipeline_stage ?? 'new_enquiry')
  const [franchiseeStatus, setFranchiseeStatus] = useState(franchisee.status)
  const [tier2Unlocked, setTier2Unlocked] = useState(franchisee.tier_2_unlocked ?? false)
  const [selectedFranchisorId, setSelectedFranchisorId] = useState(franchisee.assigned_franchisor_id ?? '')
  const [assignConfirm, setAssignConfirm] = useState(false)
  const [assignSuccess, setAssignSuccess] = useState(false)

  const currentStageIndex = FRANCHISEE_PIPELINE_STAGES.findIndex(s => s.value === pipelineStage)

  async function updatePipelineStage(stage: string) {
    setPipelineStage(stage as typeof pipelineStage)  // instant visual update
    setLoading(`stage-${stage}`)
    const supabase = createClient()
    await supabase.from('franchisee_profiles').update({ pipeline_stage: stage }).eq('id', franchisee.id)
    setLoading(null)
    // no router.refresh() — local state already shows the change
  }

  async function updateStatus(status: string) {
    setFranchiseeStatus(status as typeof franchiseeStatus)  // instant visual update
    setLoading(`status-${status}`)
    const supabase = createClient()
    await supabase
      .from('franchisee_profiles')
      .update({ status, ...(status === 'signed' ? { signed_at: new Date().toISOString() } : {}) })
      .eq('id', franchisee.id)
    setLoading(null)
    // no router.refresh() — local state already shows the change
  }

  async function toggleTier2() {
    const next = !tier2Unlocked
    setTier2Unlocked(next)           // instant visual update
    setLoading('tier2')
    const supabase = createClient()
    await supabase.from('franchisee_profiles').update({ tier_2_unlocked: next }).eq('id', franchisee.id)
    setLoading(null)
    // no router.refresh() — local state already shows the change
  }

  async function assignBrand() {
    if (!selectedFranchisorId) return
    setLoading('assign')
    const res = await fetch(`/api/admin/franchisees/${franchisee.id}/assign-brand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ franchisor_id: selectedFranchisorId }),
    })
    setLoading(null)
    if (res.ok) {
      setAssignConfirm(false)
      setAssignSuccess(true)
      router.refresh()
    }
  }

  const currentAssigned = assignedFranchisor ?? franchisors.find(f => f.id === selectedFranchisorId) ?? null

  return (
    <div className="space-y-4">

      {/* Pipeline stage */}
      <Card>
        <CardHeader><CardTitle>Pipeline stage</CardTitle></CardHeader>
        <CardBody className="space-y-1.5">
          {/* Progress bar */}
          <div className="flex gap-0.5 mb-3">
            {FRANCHISEE_PIPELINE_STAGES.map((s, i) => (
              <div
                key={s.value}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= currentStageIndex ? 'bg-brand-green' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          {FRANCHISEE_PIPELINE_STAGES.map((s, i) => (
            <button
              key={s.value}
              onClick={() => updatePipelineStage(s.value)}
              disabled={loading !== null}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                pipelineStage === s.value
                  ? 'bg-brand-green text-white border-brand-green'
                  : i < currentStageIndex
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{s.emoji}</span>
              <span className="font-medium">{s.label}</span>
              {loading === `stage-${s.value}` && <span className="ml-auto text-xs opacity-70">Saving…</span>}
              {pipelineStage === s.value && loading !== `stage-${s.value}` && (
                <span className="ml-auto text-xs opacity-70">Current</span>
              )}
            </button>
          ))}
        </CardBody>
      </Card>

      {/* Assign brand */}
      <Card>
        <CardHeader><CardTitle>Assigned brand</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {assignSuccess && franchisee.assigned_franchisor_id && (
            <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              ✓ Brand assigned and added to matches.
            </p>
          )}
          {currentAssigned && !assignSuccess && (
            <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-200">
              <p className="text-xs font-semibold text-slate-800">{currentAssigned.brand_name || 'Unnamed brand'}</p>
              <p className="text-xs text-slate-400">{currentAssigned.category || '—'}</p>
            </div>
          )}
          {!assignConfirm ? (
            <>
              <p className="text-xs text-slate-500">
                {currentAssigned ? 'Change the brand this franchisee is pursuing:' : 'Select the brand this franchisee wants to pursue:'}
              </p>
              <select
                value={selectedFranchisorId}
                onChange={e => setSelectedFranchisorId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              >
                <option value="">— Select a brand —</option>
                {franchisors.map(f => (
                  <option key={f.id} value={f.id}>{f.brand_name || 'Unnamed'} {f.category ? `(${f.category})` : ''}</option>
                ))}
              </select>
              {selectedFranchisorId && selectedFranchisorId !== franchisee.assigned_franchisor_id && (
                <button
                  onClick={() => setAssignConfirm(true)}
                  className="w-full bg-brand-green hover:bg-brand-green-dark text-white text-xs font-medium py-2 rounded-lg transition-colors"
                >
                  Assign brand
                </button>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-700">
                This will assign <strong>{franchisors.find(f => f.id === selectedFranchisorId)?.brand_name}</strong> and create a match record. The brand will see this franchisee on their matches page.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={assignBrand}
                  disabled={loading === 'assign'}
                  className="flex-1 py-1.5 text-xs font-medium bg-brand-green hover:bg-brand-green-dark text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {loading === 'assign' ? 'Assigning…' : 'Confirm'}
                </button>
                <button
                  onClick={() => setAssignConfirm(false)}
                  className="flex-1 py-1.5 text-xs font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Account status */}
      <Card>
        <CardHeader><CardTitle>Account status</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {['active', 'signed', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={franchiseeStatus === s || loading !== null}
              className="w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                border-slate-200 text-slate-700 hover:bg-slate-50 data-[active=true]:bg-brand-green data-[active=true]:text-white data-[active=true]:border-brand-green"
              data-active={franchiseeStatus === s}
            >
              {loading === `status-${s}` ? 'Saving…' : <span className="capitalize">{s.replace('_', ' ')}</span>}
            </button>
          ))}
        </CardBody>
      </Card>

      {/* Marketplace access */}
      <Card>
        <CardHeader><CardTitle>Marketplace access</CardTitle></CardHeader>
        <CardBody>
          <p className="text-xs text-slate-500 mb-3">
            {tier2Unlocked
              ? 'Marketplace is unlocked — franchisee can browse partners and request intros.'
              : 'Unlock to give this franchisee access to the partner marketplace.'}
          </p>
          <button
            onClick={toggleTier2}
            disabled={loading === 'tier2'}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tier2Unlocked
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-brand-green text-white hover:bg-brand-green-dark'
            }`}
          >
            {loading === 'tier2' ? 'Saving…' : tier2Unlocked ? '🔒 Lock marketplace' : '🔓 Unlock marketplace'}
          </button>
        </CardBody>
      </Card>

      {/* Contact */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {((franchisee as any).profiles?.email || (franchisee as any).profiles?.phone) && (
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardBody className="text-sm space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(franchisee as any).profiles?.email && (
              <a href={`mailto:${(franchisee as any).profiles.email}`} className="block text-brand-green hover:underline truncate">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(franchisee as any).profiles.email}
              </a>
            )}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(franchisee as any).profiles?.phone && (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <p className="text-slate-600">{(franchisee as any).profiles.phone}</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}
