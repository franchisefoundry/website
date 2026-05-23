'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile | null
}

export default function FranchisorPersonalForm({ profile }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null })
      .eq('id', profile!.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader><CardTitle>Personal details</CardTitle></CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">Contact support to change your email address.</p>
          </div>
          <div className="sm:col-span-2 flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-green hover:bg-brand-green-dark text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save details'}
            </button>
            {saved && <span className="text-sm text-emerald-600">Saved successfully</span>}
          </div>
        </CardBody>
      </Card>
    </form>
  )
}
