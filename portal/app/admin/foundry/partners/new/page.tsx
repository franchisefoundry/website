import { emptyForm } from '@/lib/foundry/partner-input'
import { PartnerEditor } from '@/components/foundry/admin/PartnerEditor'

export const metadata = { title: 'Add partner · Franchise Foundry' }

export default function Page() {
  return <PartnerEditor id={null} initial={emptyForm()} contacts={[]} isDemo={false} />
}
