import Link from 'next/link'
import type { PartnerProfileData } from '@/lib/foundry/data'
import type { PlanContext } from '@/lib/foundry/types'
import { NEED_LABEL, REGION_LABEL, ENGLAND, type Need, type Region } from '@/lib/foundry/taxonomy'
import { formatBudget } from '@/lib/foundry/parse'
import { TrustBadge, Monogram, Accent } from './bits'
import { PartnerIntroCard, ProfileView } from './PartnerIntroCard'

function coverage(regions: string[]): string {
  if (regions.includes('uk')) return 'UK-wide'
  if (ENGLAND.every(r => regions.includes(r)) && regions.length === ENGLAND.length) return 'England'
  return regions.map(r => REGION_LABEL[r as Region] ?? r).join(', ')
}

export function PartnerProfile({ p, base, plan }: { p: PartnerProfileData; base: string; plan: PlanContext }) {
  const facts: { l: string; v: string }[] = [
    ...p.features.map(f => ({ l: f.label, v: f.value })),
    ...(p.budget_min_gbp && p.budget_max_gbp && !p.features.length ? [{ l: 'Range', v: `${formatBudget(p.budget_min_gbp)}–${formatBudget(p.budget_max_gbp)}` }] : []),
    ...(p.reply_hours ? [{ l: 'Usually replies', v: `~${p.reply_hours} hours` }] : []),
    ...(p.client_count ? [{ l: 'Franchise clients', v: `${p.client_count}+` }] : []),
    { l: 'Covers', v: coverage(p.regions) },
  ]
  const categoryLabel = NEED_LABEL[p.category as Need] ?? p.category

  return (
    <div className="mx-auto max-w-[1180px]">
      <ProfileView partnerId={p.id} />
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-ink-3">
        <Link href={base} className="hover:text-ink">The Foundry</Link>
        <span aria-hidden="true"> / </span>
        <Link href={`${base}/search?q=${encodeURIComponent(categoryLabel)}`} className="hover:text-ink">{categoryLabel}</Link>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <main className="min-w-0 space-y-6">
          <header className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <Monogram name={p.name} size="lg" />
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{p.name}<Accent>.</Accent></h1>
                <p className="mt-1 text-ink-2">{p.tagline}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
              <TrustBadge level={p.trust_level} />
              <span className="rounded-full border border-line px-2.5 py-0.5">{categoryLabel}</span>
              {p.base_location && <span className="rounded-full border border-line px-2.5 py-0.5">Based in {p.base_location}</span>}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
              {facts.slice(0, 5).map(f => (
                <div key={f.l} className="bg-surface px-3.5 py-3">
                  <dt className="text-[11px] text-ink-3">{f.l}</dt>
                  <dd className="mt-0.5 font-mono text-sm font-semibold text-ink">{f.v}</dd>
                </div>
              ))}
            </dl>
          </header>

          {p.our_take && (
            <section className="rounded-2xl bg-ff-green p-5 text-white sm:p-7" aria-labelledby="our-take">
              <h2 id="our-take" className="font-mono text-[11px] tracking-[0.1em] text-[#e8c9a0]">OUR TAKE</h2>
              <p className="mt-2 text-lg leading-relaxed">{p.our_take}</p>
              <p className="mt-3 text-xs text-white/70">Vetted by Franchise Foundry: company checks, insurance and franchise client references.</p>
            </section>
          )}

          {(p.services.length > 0 || p.description) && (
            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7" aria-labelledby="services">
              <h2 id="services" className="text-lg font-bold text-ink">What they do</h2>
              {p.description && <p className="mt-2 text-sm text-ink-2">{p.description}</p>}
              {p.services.length > 0 && (
                <ul className="mt-4 divide-y divide-line-2">
                  {p.services.map(s => (
                    <li key={s.title} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                      <span>
                        <span className="block font-semibold text-ink">{s.title}</span>
                        {s.description && <span className="block text-sm text-ink-2">{s.description}</span>}
                      </span>
                      {s.price && <span className="font-mono text-sm text-ink">{s.price}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {p.faqs.length > 0 && (
            <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7" aria-labelledby="faqs">
              <h2 id="faqs" className="text-lg font-bold text-ink">Questions people ask</h2>
              <div className="mt-3 divide-y divide-line-2">
                {p.faqs.map((f, i) => (
                  <details key={f.q} open={i === 0} className="group py-3">
                    <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
                      {f.q}<span aria-hidden="true" className="text-xl text-ink-3 group-open:hidden">+</span><span aria-hidden="true" className="hidden text-xl text-ink-3 group-open:inline">−</span>
                    </summary>
                    <p className="mt-1 text-sm text-ink-2">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="lg:sticky lg:top-4">
          <PartnerIntroCard
            partner={{ id: p.id, slug: p.slug, name: p.name, categoryLabel, deal: p.offer_text }}
            dealTerms={p.deal_terms}
            replyHours={p.reply_hours}
            plan={plan}
          />
        </aside>
      </div>
    </div>
  )
}
