import { FoundryShell } from '@/components/foundry/pages'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <FoundryShell role="admin">{children}</FoundryShell>
}
