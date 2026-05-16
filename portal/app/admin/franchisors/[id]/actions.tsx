'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import type { FranchisorProfile } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

interface Props {
  franchisor: FranchisorProfile & { contact_email?: string | null; contact_name?: string | null }
}

export default function FranchisorStatusActions({ franchisor }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [notes, setNotes] = useState(franchisor.admin_notes ?? '')
  const [inviteEmail, setInviteEmail] = useState(franchisor.contact_email ?? '')
  const [inviteName, setInviteName] = useState(franchisor.contact_name ?? '')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)

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

  async function sendInvite() {
    if (!inviteEmail || !inviteName) {
      setInviteError('Name and email are required.')
      return
    }
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

      {/* Send invite — only shown when no user is linked yet */}
      {!franchisor.user_id && (
        <Card>
          <CardHeader><CardTitle>Send portal invite</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {inviteSent ? (
              <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                ✓ Invite sent successfully.
              </p>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  This profile has no linked user yet. Enter the franchisor&apos;s details to send their invite.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                  <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    placeholder="jane@brand.com" />
                </div>
                {inviteError && (
                  <p className="text-xs text-red-600">{inviteError}</p>
                )}
                <button onClick={sendInvite} disabled={loading === 'invite'}
                  className="w-full bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60">
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
