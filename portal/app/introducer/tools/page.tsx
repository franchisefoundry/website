import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'

export default function ToolsPage() {
  return (
    <div>
      <PageHeader
        title="Tools"
        description="Resources and tools to help you find and convert leads."
      />
      <Card className="p-12 text-center">
        <div className="text-4xl mb-4">🛠️</div>
        <p className="text-ink font-semibold text-sm mb-2">Coming soon</p>
        <p className="text-ink-3 text-xs max-w-sm mx-auto leading-relaxed">
          We&apos;re building out this section with resources to help you prospect and convert franchisee leads.
          Your referral link now lives on your{' '}
          <a href="/introducer/profile" className="text-ff-green hover:underline">account page</a>.
        </p>
      </Card>
    </div>
  )
}
