'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile | null
}

export default function AdminPersonalForm({ profile }: Props) {
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
          <Field label="Full name">
            <Input type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
          </Field>
          <Field label="Phone number">
            <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Email address">
              <Input type="email" value={profile?.email ?? ''} disabled />
            </Field>
          </div>
          <div className="sm:col-span-2 flex items-center gap-4">
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? 'Saving…' : 'Save details'}
            </Button>
            {saved && <span className="text-sm text-emerald-600">Saved successfully</span>}
          </div>
        </CardBody>
      </Card>
    </form>
  )
}
