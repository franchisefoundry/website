/**
 * Page bodies for The Foundry inside the portal. Each role's route files are
 * one-liners that call these, so franchisee and franchisor stay identical.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { foundryContext, type FoundryRole } from '@/lib/foundry/page'
import { loadPartnerProfile } from '@/lib/foundry/data'
import { foundryMode } from '@/lib/foundry/access'
import { isOffKey } from '@/lib/foundry/parse'
import { NEEDS, NEED_LABEL } from '@/lib/foundry/taxonomy'
import { PARTNER_CATEGORIES } from '@/lib/partner-categories'
import { IntroListProvider } from './IntroList'
import { AskPanel } from './AskPanel'
import { ResultsView } from './ResultsView'
import { PartnerProfile } from './PartnerProfile'
import { Accent } from './bits'

export async function FoundryShell({ role, children }: { role: FoundryRole; children: React.ReactNode }) {
  const ctx = await foundryContext(role)
  return (
    <IntroListProvider viewerId={ctx.viewer.id} base={ctx.base}>
      {ctx.preview && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-ff-gold bg-[var(--ff-gold-soft)] px-4 py-2 text-xs text-[#6b4a1d]">
          <span className="font-mono font-semibold tracking-wide">PREVIEW</span>
          Only people on the preview list can see The Foundry. Partners shown are demo data.
        </div>
      )}
      {children}
    </IntroListProvider>
  )
}

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
}

export async function AskPage({ role }: { role: FoundryRole }) {
  const ctx = await foundryContext(role)
  const counts = new Map<string, number>()
  for (const p of ctx.partners) {
    if (ctx.plan.audience !== 'any' && p.audience !== 'both' && p.audience !== ctx.plan.audience) continue
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
  }
  const deals = ctx.partners.filter(p => p.offer_text).length

  return (
    <div className="mx-auto max-w-[1080px]">
      <div className="font-mono text-xs tracking-[0.1em] text-ink-3">
        {greeting().toUpperCase()}{ctx.firstName ? `, ${ctx.firstName.toUpperCase()}` : ''}
      </div>
      <h1 className="mb-6 mt-2 text-4xl font-extrabold leading-none tracking-[-0.04em] text-ink sm:text-6xl">
        What do you need next<Accent>?</Accent>
      </h1>

      <AskPanel base={ctx.base} plan={ctx.plan} />

      <h2 className="mb-3 mt-10 font-mono text-xs tracking-[0.1em] text-ink-3">OR BROWSE BY NEED</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {NEEDS.map(n => {
          const meta = PARTNER_CATEGORIES.find(c => c.value === n)
          const count = counts.get(n) ?? 0
          const Icon = meta?.Icon
          return (
            <Link key={n} href={`${ctx.base}/search?q=${encodeURIComponent(NEED_LABEL[n])}`}
              className={`flex min-h-[96px] flex-col justify-between rounded-2xl border border-line bg-surface p-4 transition hover:border-ff-green ${count ? '' : 'opacity-60'}`}>
              <span className="flex items-center gap-2 font-bold text-ink">
                {Icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ff-green"><Icon className="h-4 w-4" /></span>}
                {NEED_LABEL[n]}
              </span>
              <span className="text-xs text-ink-3">{count ? `${count} vetted partner${count === 1 ? '' : 's'}` : 'Coming soon'}</span>
            </Link>
          )
        })}
      </div>

      {deals > 0 && (
        <p className="mt-6 rounded-2xl bg-ff-green px-5 py-4 text-sm text-white">
          <span className="font-mono text-[#e8c9a0]">{deals}</span> partner{deals === 1 ? ' has' : 's have'} a member deal. They apply automatically when you request the intro through us.
        </p>
      )}
    </div>
  )
}

export async function SearchPage({ role, searchParams }: {
  role: FoundryRole
  searchParams: Promise<{ q?: string; off?: string }>
}) {
  const ctx = await foundryContext(role)
  const sp = await searchParams
  const q = (sp.q ?? '').slice(0, 300)
  const off = (sp.off ?? '').split(',').filter(isOffKey)
  return <ResultsView base={ctx.base} initialQ={q} initialOff={off} plan={ctx.plan} />
}

export async function PartnerPage({ role, params }: { role: FoundryRole; params: Promise<{ slug: string }> }) {
  const ctx = await foundryContext(role)
  const { slug } = await params
  const p = await loadPartnerProfile(createAdminClient(), slug, { includeDemo: foundryMode() === 'preview' })
  if (!p) notFound()
  return <PartnerProfile p={p} base={ctx.base} plan={ctx.plan} />
}
