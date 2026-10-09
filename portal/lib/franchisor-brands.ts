import type { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Deletes a user's empty draft brands (no name, questionnaire or matches),
 * keeping `keepId`. The handle_new_user DB trigger auto-creates one of these
 * for every new franchisor login; when that login is attached to a brand an
 * admin already set up, the blank twin must go or the brand shows up twice.
 */
export async function removeBlankDraftBrands(admin: Admin, userId: string, keepId: string) {
  const { data: drafts } = await admin.from('franchisor_profiles')
    .select('id')
    .eq('user_id', userId).eq('status', 'draft').is('brand_name', null).neq('id', keepId)
  for (const d of drafts ?? []) {
    const [{ count: quiz }, { count: matches }] = await Promise.all([
      admin.from('franchisor_questionnaires').select('*', { count: 'exact', head: true }).eq('franchisor_id', d.id),
      admin.from('matches').select('*', { count: 'exact', head: true }).eq('franchisor_id', d.id),
    ])
    if (!quiz && !matches) await admin.from('franchisor_profiles').delete().eq('id', d.id)
  }
}

/** Finds a live (non-archived) brand whose name matches, ignoring case/punctuation. */
export async function findBrandByName(admin: Admin, name: string) {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!key) return null
  const { data } = await admin.from('franchisor_profiles').select('id, brand_name').is('archived_at', null).not('brand_name', 'is', null)
  return (data ?? []).find(b => (b.brand_name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') === key) ?? null
}

/** slugify(name), suffixed -2, -3… until it doesn't collide (slug is unique). */
export async function uniqueBrandSlug(admin: Admin, name: string) {
  const base = slugify(name) || 'brand'
  const { data } = await admin.from('franchisor_profiles').select('slug').like('slug', `${base}%`)
  const taken = new Set((data ?? []).map(r => r.slug))
  let slug = base
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`
  return slug
}
