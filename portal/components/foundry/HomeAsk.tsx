/** Compact Ask panel for portal home pages. Renders nothing unless The Foundry is visible to this user. */
import { canSeeFoundry, currentViewer } from '@/lib/foundry/access'
import { planContextFor } from '@/lib/foundry/data'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FoundryRole } from '@/lib/foundry/page'
import { AskPanel } from './AskPanel'

export async function HomeAsk({ role }: { role: FoundryRole }) {
  if (!(await canSeeFoundry())) return null
  const viewer = await currentViewer()
  if (!viewer) return null
  const plan = await planContextFor(createAdminClient(), viewer)
  if (viewer.role === 'admin') plan.audience = role
  return (
    <section className="mb-6" aria-label="The Foundry">
      <h2 className="mb-2.5 text-lg font-bold tracking-tight text-ink">What do you need next?</h2>
      <AskPanel base={`/${role}/foundry`} plan={plan} compact />
    </section>
  )
}
