'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'
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

  // Notify the recipient (in-app always; push + email per their prefs).
  let recipientId: string | null = null
  if (thread_type === 'introducer') {
    recipientId = thread_id
  } else {
    const table = thread_type === 'franchisee' ? 'franchisee_profiles' : 'franchisor_profiles'
    const { data } = await admin.from(table).select('user_id').eq('id', thread_id).single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recipientId = (data as any)?.user_id ?? null
  }
  if (recipientId) {
    try {
      await notify({
        userId: recipientId,
        event: 'new_message',
        title: 'New message from Franchise Foundry',
        body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
        link: `/${thread_type}`,
      })
    } catch (e) { console.error('[messages] notify failed', e) }
  }

  revalidatePath('/admin/messages')
  redirect(`/admin/messages?thread=${encodeURIComponent(target)}`)
}
