'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { initials } from '@/lib/utils'

interface Props {
  userId: string
  fullName: string | null
  avatarUrl: string | null
}

export default function AccountSettingsCard({ userId, fullName, avatarUrl }: Props) {
  const router = useRouter()
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    setDeleteError(null)
    const res = await fetch('/api/auth/delete-account', { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setDeleteError(data.error ?? 'Failed to delete account. Please contact support.')
      setDeleteLoading(false)
      return
    }
    // Sign out client-side and redirect to login
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('File must be under 2MB')
      return
    }

    setAvatarLoading(true)
    setAvatarError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setAvatarError(uploadError.message)
      setAvatarLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').update({ avatar_url: urlWithBust }).eq('id', userId)
    setCurrentAvatar(urlWithBust)
    setAvatarLoading(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwMsg(null)

    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setPwLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)

    if (error) {
      setPwMsg({ type: 'error', text: error.message })
    } else {
      setPwMsg({ type: 'success', text: 'Password updated successfully' })
      setNewPw('')
      setConfirmPw('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile photo */}
      <Card>
        <CardHeader><CardTitle>Profile photo</CardTitle></CardHeader>
        <CardBody className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-brand-green flex items-center justify-center text-white text-lg font-bold flex-shrink-0 overflow-hidden">
            {currentAvatar
              ? <img src={currentAvatar} alt="Profile" className="w-full h-full object-cover" />
              : <span>{initials(fullName)}</span>
            }
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
            >
              {avatarLoading ? 'Uploading…' : 'Upload photo'}
            </button>
            {currentAvatar && !avatarLoading && (
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient()
                  await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
                  setCurrentAvatar(null)
                }}
                className="ml-3 px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            )}
            <p className="text-xs text-slate-400 mt-1.5">JPG, PNG or GIF · max 2 MB</p>
            {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
          </div>
        </CardBody>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardBody>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
            <Field label="New password">
              <Input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat password"
              />
            </Field>
            {pwMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg border ${
                pwMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {pwMsg.text}
              </p>
            )}
            <Button type="submit" disabled={pwLoading || !newPw || !confirmPw}>
              {pwLoading ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader><CardTitle>Data &amp; privacy</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-500">
            Read our{' '}
            <Link href="/privacy" className="text-brand-green hover:underline font-medium">
              Privacy Policy
            </Link>{' '}
            to understand how we collect, use and protect your personal data.
            To request a copy of your data or raise any GDPR query, email{' '}
            <a href="mailto:connect@franchisefoundry.co.uk" className="text-brand-green hover:underline font-medium">
              connect@franchisefoundry.co.uk
            </a>.
          </p>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-red-600 mb-1">Delete account</p>
            <p className="text-xs text-slate-500 mb-3">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="text-sm text-red-500 border border-red-200 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
              >
                Delete my account
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 max-w-sm">
                <p className="text-sm font-medium text-red-700">Are you sure?</p>
                <p className="text-xs text-red-600">
                  Your profile, matches and all data will be permanently deleted. This action cannot be reversed.
                </p>
                {deleteError && (
                  <p className="text-xs text-red-600 bg-white border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="danger" onClick={handleDeleteAccount} disabled={deleteLoading}>
                    {deleteLoading ? 'Deleting…' : 'Yes, delete my account'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setDeleteConfirm(false); setDeleteError(null) }}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
