'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorised')
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (data?.role !== 'admin') throw new Error('Forbidden')
}

export async function addTerritory(formData: FormData) {
  await assertAdmin()
  const franchisor_id = String(formData.get('franchisor_id') || '')
  const name = String(formData.get('name') || '').trim()
  if (!franchisor_id || !name) return
  const admin = createAdminClient()
  await admin.from('territories').insert({
    franchisor_id,
    name,
    region: String(formData.get('region') || '').trim() || null,
    status: String(formData.get('status') || 'open'),
  })
  revalidatePath('/admin/territories')
  revalidatePath('/admin/franchisors/[id]', 'page')
}

export async function setTerritoryStatus(formData: FormData) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('territories')
    .update({ status: String(formData.get('status')), updated_at: new Date().toISOString() })
    .eq('id', String(formData.get('id')))
  revalidatePath('/admin/territories')
  revalidatePath('/admin/franchisors/[id]', 'page')
}

export async function deleteTerritory(formData: FormData) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('territories').delete().eq('id', String(formData.get('id')))
  revalidatePath('/admin/territories')
  revalidatePath('/admin/franchisors/[id]', 'page')
}
