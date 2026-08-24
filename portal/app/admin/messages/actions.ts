'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function sendMessage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorised')
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') throw new Error('Forbidden')

  const body = String(formData.get('body') || '').trim()
  const target = String(formData.get('target') || '')      // "type:id"
  const [thread_type, thread_id] = target.split(':')
  if (!body || !thread_type || !thread_id) return

  const admin = createAdminClient()
  await admin.from('messages').insert({ thread_type, thread_id, body, from_admin: true, sender_id: user.id })
  revalidatePath('/admin/messages')
  redirect(`/admin/messages?thread=${encodeURIComponent(target)}`)
}
