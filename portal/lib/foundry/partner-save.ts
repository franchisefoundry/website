/** Server side of the partner editor: validate, check go-live rules, write. */
import type { SupabaseClient } from '@supabase/supabase-js'
import { cleanPartnerInput, liveGaps, type CleanResult } from './partner-input.ts'

export async function savePartner(
  admin: SupabaseClient, id: string | null, body: unknown,
): Promise<{ ok: true; id: string; slug: string } | { errors: CleanResult['errors'] }> {
  const { row, errors } = cleanPartnerInput(body)
  if (Object.keys(errors).length) return { errors }

  if (row.status === 'live') {
    const { count } = id
      ? await admin.from('partner_contacts').select('id', { count: 'exact', head: true }).eq('partner_id', id)
      : { count: 0 }
    const gaps = liveGaps(row, count ?? 0)
    if (gaps.length) return { errors: { status: `Before going live, add: ${gaps.join(', ')}.${id ? '' : ' Save as a draft first, then add a contact.'}` } }
  }

  if (id) {
    const { data, error } = await admin.from('partners').update(row).eq('id', id).select('id, slug').maybeSingle()
    if (error?.code === '23505') return { errors: { slug: 'Another partner already uses that web address.' } }
    if (error || !data) return { errors: { name: 'Could not save. Try again.' } }
    return { ok: true, id: data.id, slug: data.slug }
  }

  const { data: last } = await admin.from('partners').select('display_order').order('display_order', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await admin.from('partners')
    .insert({ ...row, display_order: (last?.display_order ?? 0) + 1 }).select('id, slug').single()
  if (error?.code === '23505') return { errors: { slug: 'Another partner already uses that web address.' } }
  if (error || !data) return { errors: { name: 'Could not save. Try again.' } }
  return { ok: true, id: data.id, slug: data.slug }
}
