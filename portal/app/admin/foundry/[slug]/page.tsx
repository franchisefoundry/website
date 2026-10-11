import { PartnerPage } from '@/components/foundry/pages'

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <PartnerPage role="admin" params={params} />
}
