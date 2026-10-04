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

export async function addResale(formData: FormData) {
  await assertAdmin()
  const brand_name = String(formData.get('brand_name') || '').trim()
  if (!brand_name) return
  const priceRaw = String(formData.get('asking_price') || '').replace(/[^0-9]/g, '')
  const admin = createAdminClient()
  await admin.from('resales').insert({
    brand_name,
    location: String(formData.get('location') || '').trim() || null,
    asking_price: priceRaw ? Number(priceRaw) : null,
    turnover: String(formData.get('turnover') || '').trim() || null,
    reason: String(formData.get('reason') || '').trim() || null,
    status: String(formData.get('status') || 'available'),
  })
  revalidatePath('/admin/resales')
}

export async function setResaleStatus(formData: FormData) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('resales').update({ status: String(formData.get('status')) }).eq('id', String(formData.get('id')))
  revalidatePath('/admin/resales')
}

export async function deleteResale(formData: FormData) {
  await assertAdmin()
  const admin = createAdminClient()
  await admin.from('resales').delete().eq('id', String(formData.get('id')))
  revalidatePath('/admin/resales')
}
