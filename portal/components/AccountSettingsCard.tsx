'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { initials } from '@/lib/utils'

interface Props {
  userId: string
  fullName: string | null
  avatarUrl: string | null
}

export default function AccountSettingsCard({ userId, fullName, avatarUrl }: Props) {
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
              />
            </div>
            {pwMsg && (
              <p className={`text-sm px-3 py-2 rounded-lg border ${
                pwMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              }`}>
                {pwMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={pwLoading || !newPw || !confirmPw}
              className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 px-5 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
