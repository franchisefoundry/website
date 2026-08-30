'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface Weights {
  experience: number; budget: number; operator: number; timeline: number
  format: number; location: number; full_time: number; multi_site: number
}

export async function saveWeights(weights: Weights) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorised')
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') throw new Error('Forbidden')

  const clean = (n: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))
  const admin = createAdminClient()
  await admin.from('match_weights').update({
    experience: clean(weights.experience),
    budget: clean(weights.budget),
    operator: clean(weights.operator),
    timeline: clean(weights.timeline),
    format: clean(weights.format),
    location: clean(weights.location),
    full_time: clean(weights.full_time),
    multi_site: clean(weights.multi_site),
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  revalidatePath('/admin/settings')
}
