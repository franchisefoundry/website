import { SearchPage } from '@/components/foundry/pages'

export const metadata = { title: 'Foundry Search · Franchise Foundry' }

export default function Page({ searchParams }: { searchParams: Promise<{ q?: string; off?: string }> }) {
  return <SearchPage role="franchisor" searchParams={searchParams} />
}
