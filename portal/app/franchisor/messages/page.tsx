import { ClientMessages } from '@/components/client/ClientMessages'

export const dynamic = 'force-dynamic'

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string; to?: string; compose?: string }> }) {
  return <ClientMessages params={await searchParams} />
}
