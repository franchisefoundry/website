import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryMode } from '@/lib/foundry/access'
import { isUuid } from '@/lib/foundry/validate'
import { formFromRow } from '@/lib/foundry/partner-input'
import { PartnerEditor } from '@/components/foundry/admin/PartnerEditor'

export const metadata = { title: 'Edit partner · Franchise Foundry' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const admin = createAdminClient()
  const [{ data: p }, { data: contacts }] = await Promise.all([
    admin.from('partners').select('*').eq('id', id).maybeSingle(),
    admin.from('partner_contacts').select('id, name, email, phone, role, is_primary').eq('partner_id', id).order('is_primary', { ascending: false }),
  ])
  if (!p || (p.is_demo && foundryMode() !== 'preview')) notFound()
  return <PartnerEditor id={id} initial={formFromRow(p)} contacts={contacts ?? []} isDemo={p.is_demo} />
}
