import { PageHeader } from '@/components/page-header'
import { MarketplaceIcon } from '@/components/icons'

/** Placeholder shell for a client section that's designed but not yet built. */
export function ComingSoon({
  title,
  description,
  blurb,
  icon,
}: {
  title: string
  description?: string
  blurb?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="max-w-3xl">
      <PageHeader title={title} description={description} />
      <div className="bg-surface border border-line rounded-2xl shadow-[0_1px_2px_rgba(27,33,26,0.04)] px-6 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-ff-green-soft text-ff-green flex items-center justify-center mx-auto mb-5">
          {icon ?? <MarketplaceIcon className="w-7 h-7" />}
        </div>
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.1em] text-ff-gold-ink bg-ff-gold-soft rounded-full px-3 py-1 mb-3">
          Coming soon
        </span>
        <h2 className="text-lg font-semibold text-ink">{title} is on the way</h2>
        <p className="text-sm text-ink-2 mt-2 max-w-md mx-auto leading-relaxed">
          {blurb ?? 'We’re building this out. Check back shortly — you’ll be notified when it’s ready.'}
        </p>
      </div>
    </div>
  )
}
