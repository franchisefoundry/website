import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { statusBadge } from '@/components/ui/badge'
import { formatInvestmentRange } from '@/lib/utils'
import FranchisorStatusActions from './actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FranchisorDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: franchisor } = await supabase
    .from('franchisor_profiles')
    .select('*, profiles(full_name, email)')
    .eq('id', id)
    .single()

  if (!franchisor) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = franchisor.profiles as any

  return (
    <div>
      <PageHeader
        title={franchisor.brand_name || 'Incomplete profile'}
        description={profile?.email}
      />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Brand profile</CardTitle>
                {statusBadge(franchisor.status)}
              </div>
            </CardHeader>
            <CardBody>
              {franchisor.teaser && (
                <p className="text-sm text-slate-600 mb-6 italic">&ldquo;{franchisor.teaser}&rdquo;</p>
              )}
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-slate-500 mb-0.5">Category</dt>
                  <dd className="font-medium">{franchisor.category || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Investment range</dt>
                  <dd className="font-medium">{formatInvestmentRange(franchisor.investment_min, franchisor.investment_max)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Locations</dt>
                  <dd className="font-medium">{franchisor.locations_display || franchisor.locations_available?.join(', ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Timeline</dt>
                  <dd className="font-medium">{franchisor.timeline_months ? `${franchisor.timeline_months} months` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Operator model</dt>
                  <dd className="font-medium capitalize">{franchisor.operator_model?.replace('-', ' ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Experience required</dt>
                  <dd className="font-medium capitalize">{franchisor.experience_required?.replace('-', ' ') || '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Full-time required</dt>
                  <dd className="font-medium">{franchisor.full_time_required ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 mb-0.5">Multi-site ready</dt>
                  <dd className="font-medium">{franchisor.multi_site_ready ? 'Yes' : 'No'}</dd>
                </div>
              </dl>

              {franchisor.highlights?.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-slate-700 mb-2">Highlights</p>
                  <ul className="space-y-1">
                    {franchisor.highlights.map((h: string, i: number) => (
                      <li key={i} className="text-sm text-slate-600 flex gap-2">
                        <span className="text-brand-gold mt-0.5">•</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <FranchisorStatusActions franchisor={franchisor} />
        </div>
      </div>
    </div>
  )
}
