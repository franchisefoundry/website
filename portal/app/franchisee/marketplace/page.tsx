import { redirect } from 'next/navigation'
import { ComingSoon } from '@/components/client/ComingSoon'
import { canSeeFoundry } from '@/lib/foundry/access'

export default async function MarketplacePage() {
  if (await canSeeFoundry()) redirect('/franchisee/foundry')
  return (
    <ComingSoon
      title="Marketplace"
      description="Trusted partners to help you set up and grow."
      blurb="A curated directory of vetted partners — finance, legal, fit-out, marketing and more, with member-only deals. We're finishing it now."
    />
  )
}
