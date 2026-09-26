'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import type { FranchisorProfile } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

interface LinkedUser {
  full_name: string | null
  email: string | null
}

interface Props {
  franchisor: FranchisorProfile & { contact_email?: string | null; contact_name?: string | null }
  linkedUser?: LinkedUser | null
}

export default function FranchisorStatusActions({ franchisor, linkedUser }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [status, setStatus] = useState(franchisor.status)
  const [notes, setNotes] = useState(franchisor.admin_notes ?? '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [marketplaceUnlocked, setMarketplaceUnlocked] = useState(franchisor.marketplace_unlocked ?? false)
  const [inviteEmail, setInviteEmail] = useState(franchisor.contact_email ?? '')
  const [inviteName, setInviteName] = useState(franchisor.contact_name ?? '')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [unlinkConfirm, setUnlinkConfirm] = useState(false)

  async function updateStatus(next: string) {
    setStatus(next as typeof status)  // instant visual update
    setLoading(next)
    const supabase = createClient()
    await supabase.from('franchisor_profiles').update({ status: next }).eq('id', franchisor.id)
    setLoading(null)
    // no router.refresh() — local state already shows the change
  }

  async function sendInvite() {
    if (!inviteEmail || !inviteName) { setInviteError('Name and email are required.'); return }
    setLoading('invite')
    setInviteError(null)
    const res = await fetch(`/api/admin/franchisors/${franchisor.id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, name: inviteName }),
    })
    const data = await res.json()
    setLoading(null)
    if (!res.ok) { setInviteError(data.error ?? 'Something went wrong.'); return }
    setInviteSent(true)
    router.refresh()
  }

  async function toggleMarketplace() {
    const next = !marketplaceUnlocked
    setMarketplaceUnlocked(next)   // instant visual update
    setLoading('marketplace')
    const supabase = createClient()
    await supabase.from('franchisor_profiles').update({ marketplace_unlocked: next }).eq('id', franchisor.id)
    setLoading(null)
    // no router.refresh() — local state already shows the change
  }

  async function saveNotes() {
    setLoading('notes')
    const supabase = createClient()
    await supabase.from('franchisor_profiles').update({ admin_notes: notes }).eq('id', franchisor.id)
    setLoading(null)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 3000)
    // no router.refresh() — notes aren't displayed elsewhere on the page
  }

  async function unlinkUser() {
    setLoading('unlink')
    const res = await fetch(`/api/admin/franchisors/${franchisor.id}`, { method: 'PATCH' })
    setLoading(null)
    if (res.ok) {
      setUnlinkConfirm(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">

      {/* Linked user — shown when a user IS linked */}
      {franchisor.user_id && (
        <Card>
          <CardHeader><CardTitle>Linked user account</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div className="text-sm space-y-1">
              <p className="font-medium text-ink">{linkedUser?.full_name || '—'}</p>
              <p className="text-ink-3 text-xs">{linkedUser?.email || '—'}</p>
            </div>
            {unlinkConfirm ? (
              <div className="space-y-2">
                <p className="text-xs text-red-600 font-medium">
                  This will remove portal access for this user. The brand profile will be kept.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={unlinkUser}
                    disabled={loading === 'unlink'}
                    className="flex-1 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60"
                  >
                    {loading === 'unlink' ? 'Removing…' : 'Yes, remove access'}
                  </button>
                  <button
                    onClick={() => setUnlinkConfirm(false)}
                    className="flex-1 py-1.5 text-xs font-medium border border-line text-ink-2 hover:bg-surface-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setUnlinkConfirm(true)}
                className="w-full py-2 px-3 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
              >
                Remove portal access
              </button>
            )}
          </CardBody>
        </Card>
      )}

      {/* Send invite — only shown when no user is linked */}
      {!franchisor.user_id && (
        <Card>
          <CardHeader><CardTitle>Send portal invite</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {inviteSent ? (
              <p className="text-sm text-ff-green bg-ff-green-soft border border-ff-green/20 rounded-lg px-3 py-2">
                ✓ Invite sent successfully.
              </p>
            ) : (
              <>
                <p className="text-xs text-ink-3">
                  No linked user yet. Enter the franchisor&apos;s details to send their portal invite.
                </p>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Name</label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green focus:border-transparent"
                    placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1">Email</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green focus:border-transparent"
                    placeholder="jane@brand.com" />
                </div>
                {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
                <button onClick={sendInvite} disabled={loading === 'invite'}
                  className="w-full bg-ff-green hover:bg-ff-green-deep text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60">
                  {loading === 'invite' ? 'Sending…' : 'Send invite'}
                </button>
              </>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Profile status</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {['draft', 'pending_review', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={status === s || loading !== null}
              className="w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                border-line text-ink-2 hover:bg-surface-2 data-[active=true]:bg-ff-green data-[active=true]:text-white data-[active=true]:border-ff-green"
              data-active={status === s}
            >
              {loading === s ? 'Saving…' : <span className="capitalize">{s.replace('_', ' ')}</span>}
            </button>
          ))}
          <p className="text-xs text-ink-3 pt-1">
            Set to <strong>Active</strong> to make this brand available for matching.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Marketplace access</CardTitle></CardHeader>
        <CardBody>
          <p className="text-xs text-ink-3 mb-3">
            {marketplaceUnlocked
              ? 'Marketplace is unlocked — franchisor can browse partners and request intros.'
              : 'Unlock to give this franchisor access to the partner marketplace.'}
          </p>
          <button
            onClick={toggleMarketplace}
            disabled={loading === 'marketplace'}
            className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              marketplaceUnlocked
                ? 'bg-surface-2 text-ink-2 hover:bg-surface-2'
                : 'bg-ff-green text-white hover:bg-ff-green-deep'
            }`}
          >
            {loading === 'marketplace' ? 'Saving…' : marketplaceUnlocked ? '🔒 Lock marketplace' : '🔓 Unlock marketplace'}
          </button>
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
            className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green focus:border-transparent resize-none"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={saveNotes}
              disabled={loading === 'notes'}
              className="flex-1 bg-surface-2 hover:bg-surface-2 text-ink-2 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading === 'notes' ? 'Saving…' : 'Save notes'}
            </button>
            {notesSaved && <span className="text-xs text-ff-green font-medium">✓ Saved</span>}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
