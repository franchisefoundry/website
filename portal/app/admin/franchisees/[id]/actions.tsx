'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import type { FranchiseeProfile } from '@/lib/supabase/types'
import { FRANCHISEE_PIPELINE_STAGES } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

interface FranchisorOption {
  id: string
  brand_name: string | null
  category: string | null
}

interface Props {
  franchisee: FranchiseeProfile
  franchisors: FranchisorOption[]
  assignedFranchisor?: FranchisorOption | null
  backupFranchisor1?: FranchisorOption | null
  backupFranchisor2?: FranchisorOption | null
}

function BrandSelector({
  label,
  rank,
  franchiseeId,
  current,
  franchisors,
  onSuccess,
}: {
  label: string
  rank: 1 | 2 | 3
  franchiseeId: string
  current: FranchisorOption | null
  franchisors: FranchisorOption[]
  onSuccess: () => void
}) {
  const [selected, setSelected] = useState(current?.id ?? '')
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [search, setSearch] = useState('')

  const isPrimary = rank === 1

  const filteredFranchisors = search.trim()
    ? franchisors.filter(f =>
        (f.brand_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (f.category ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : franchisors

  async function assign() {
    if (!selected) return
    setLoading(true)
    const res = await fetch(`/api/admin/franchisees/${franchiseeId}/assign-brand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ franchisor_id: selected, rank }),
    })
    setLoading(false)
    if (res.ok) {
      setConfirming(false)
      setSearch('')
      toast(`${pendingBrand?.brand_name ?? 'Brand'} assigned as ${label.toLowerCase()}`)
      onSuccess()
    } else {
      toast('Assignment failed. Please try again.', 'error')
    }
  }

  async function remove() {
    setRemoving(true)
    await fetch(`/api/admin/franchisees/${franchiseeId}/assign-brand`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rank }),
    })
    setRemoving(false)
    setSelected('')
    toast('Brand removed')
    onSuccess()
  }

  const pendingBrand = franchisors.find(f => f.id === selected)
  const changed = selected && selected !== (current?.id ?? '')

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</p>
        {current && (
          <button
            onClick={remove}
            disabled={removing}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {removing ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>

      {current && (
        <div className={`rounded-lg px-3 py-2.5 border ${isPrimary ? 'bg-brand-green/5 border-brand-green/20' : 'bg-slate-50 border-slate-200'}`}>
          <p className="text-xs font-semibold text-slate-800">{current.brand_name || 'Unnamed brand'}</p>
          <p className="text-xs text-slate-400">{current.category || '—'}</p>
          {isPrimary && (
            <p className="text-[10px] text-brand-green font-medium mt-0.5">
              🔔 Franchisor notified on assignment
            </p>
          )}
        </div>
      )}

      {!confirming ? (
        <>
          {/* Search filter */}
          <input
            type="text"
            placeholder="Search brands…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent placeholder:text-slate-400"
          />
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            size={Math.min(filteredFranchisors.length + 1, 6)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
          >
            <option value="">— {current ? 'change brand' : 'select a brand'} —</option>
            {filteredFranchisors.map(f => (
              <option key={f.id} value={f.id}>
                {f.brand_name || 'Unnamed'}{f.category ? ` · ${f.category}` : ''}
              </option>
            ))}
          </select>
          {filteredFranchisors.length === 0 && search && (
            <p className="text-xs text-slate-400 text-center py-1">No brands match &ldquo;{search}&rdquo;</p>
          )}
          {changed && (
            <button
              onClick={() => setConfirming(true)}
              className="w-full bg-brand-green hover:bg-brand-green-dark text-white text-xs font-medium py-2 rounded-lg transition-colors"
            >
              {current ? 'Change brand' : `Assign ${label.toLowerCase()}`}
            </button>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-700">
            Assign <strong>{pendingBrand?.brand_name}</strong> as {label.toLowerCase()}?
            {isPrimary && ' The franchisor will receive an email notification.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={assign}
              disabled={loading}
              className="flex-1 py-1.5 text-xs font-medium bg-brand-green hover:bg-brand-green-dark text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? 'Assigning…' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 py-1.5 text-xs font-medium border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FranchiseeActions({
  franchisee,
  franchisors,
  assignedFranchisor,
  backupFranchisor1,
  backupFranchisor2,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [pipelineStage, setPipelineStage] = useState(franchisee.pipeline_stage ?? 'new_enquiry')
  const [franchiseeStatus, setFranchiseeStatus] = useState(franchisee.status)
  const [tier2Unlocked, setTier2Unlocked] = useState(franchisee.tier_2_unlocked ?? false)

  const currentStageIndex = FRANCHISEE_PIPELINE_STAGES.findIndex(s => s.value === pipelineStage)

  async function updatePipelineStage(stage: string) {
    setPipelineStage(stage as typeof pipelineStage)
    setLoading(`stage-${stage}`)
    const supabase = createClient()
    await supabase.from('franchisee_profiles').update({ pipeline_stage: stage }).eq('id', franchisee.id)
    setLoading(null)
    const label = FRANCHISEE_PIPELINE_STAGES.find(s => s.value === stage)?.label
    toast(`Stage → ${label ?? stage}`)
  }

  async function updateStatus(status: string) {
    setFranchiseeStatus(status as typeof franchiseeStatus)
    setLoading(`status-${status}`)
    const supabase = createClient()
    await supabase
      .from('franchisee_profiles')
      .update({ status, ...(status === 'signed' ? { signed_at: new Date().toISOString() } : {}) })
      .eq('id', franchisee.id)
    setLoading(null)
    toast(`Account status → ${status}`)
  }

  async function toggleTier2() {
    const next = !tier2Unlocked
    setTier2Unlocked(next)
    setLoading('tier2')
    const supabase = createClient()
    await supabase.from('franchisee_profiles').update({ tier_2_unlocked: next }).eq('id', franchisee.id)
    setLoading(null)
    toast(next ? 'Marketplace unlocked' : 'Marketplace locked')
  }

  return (
    <div className="space-y-4">

      {/* Contact — first thing you want when opening a person's profile */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {((franchisee as any).profiles?.email || (franchisee as any).profiles?.phone) && (
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardBody className="text-sm space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(franchisee as any).profiles?.email && (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      {/* Pipeline stage */}
      <Card>
        <CardHeader><CardTitle>Pipeline stage</CardTitle></CardHeader>
        <CardBody className="space-y-1.5">
          <div className="flex gap-0.5 mb-3">
            {FRANCHISEE_PIPELINE_STAGES.map((s, i) => (
              <div
                key={s.value}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentStageIndex ? 'bg-brand-green' : 'bg-slate-200'}`}
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

      {/* Brand assignments — primary + 2 backups */}
      <Card>
        <CardHeader>
          <CardTitle>Brand assignments</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5 divide-y divide-slate-100">
          <BrandSelector
            label="Primary brand"
            rank={1}
            franchiseeId={franchisee.id}
            current={assignedFranchisor ?? null}
            franchisors={franchisors}
            onSuccess={() => router.refresh()}
          />
          <div className="pt-4">
            <BrandSelector
              label="Backup 1"
              rank={2}
              franchiseeId={franchisee.id}
              current={backupFranchisor1 ?? null}
              franchisors={franchisors}
              onSuccess={() => router.refresh()}
            />
          </div>
          <div className="pt-4">
            <BrandSelector
              label="Backup 2"
              rank={3}
              franchiseeId={franchisee.id}
              current={backupFranchisor2 ?? null}
              franchisors={franchisors}
              onSuccess={() => router.refresh()}
            />
          </div>
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

    </div>
  )
}
