import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { statusBadge } from '@/components/ui/badge'
import { Section } from '@/components/crm/Section'
import { formatInvestmentRange } from '@/lib/utils'
import { MailIcon } from '@/components/icons'
import { RecordDrawerHost as DrawerHost } from '@/components/crm/RecordDrawerHost'

interface Props { params: Promise<{ id: string }> }

const gmail = (e: string) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e)}`

export default async function BrandModal({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: b }, { data: matches }] = await Promise.all([
    admin.from('franchisor_profiles').select('*, profiles(full_name, email)').eq('id', id).single(),
    admin.from('matches')
      .select('id, score, franchisee_profiles(id, profiles!franchisee_profiles_user_id_fkey(full_name, role))')
      .eq('franchisor_id', id).order('score', { ascending: false }).limit(6),
  ])

  if (!b) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = b.profiles as any
  const candidates = (matches ?? []).filter(m => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (m.franchisee_profiles as any)?.profiles?.role === 'franchisee'
  })

  return (
    <DrawerHost expandHref={`/admin/franchisors/${id}`} ariaLabel={b.brand_name ?? undefined}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar name={b.brand_name} size="lg" square />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-ink truncate">{b.brand_name || 'Incomplete profile'}</h2>
              {statusBadge(b.status)}
            </div>
            <p className="text-sm text-ink-2 mt-0.5 truncate">{[b.category, profile?.email].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {profile?.email && (
            <a href={gmail(profile.email)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-2 border border-line bg-surface hover:bg-surface-2 transition-colors">
              <MailIcon className="w-4 h-4" /> Email
            </a>
          )}
          <Link href={`/admin/franchisors/${id}/questionnaire`}
            className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-medium bg-ff-green text-white shadow-sm hover:brightness-110 transition-all">
            Review
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <Section title="Snapshot">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Franchise fee', b.franchise_fee ? `£${b.franchise_fee.toLocaleString()}` : '—'],
              ['Investment', formatInvestmentRange(b.investment_min, b.investment_max)],
              ['Category', b.category || '—'],
              ['Candidates', String(candidates.length)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-ink-3 mb-0.5">{k}</dt>
                <dd className="font-medium text-ink capitalize">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title={`Candidates matched (${candidates.length})`}>
          {candidates.length === 0 ? (
            <p className="text-sm text-ink-3">None yet.</p>
          ) : (
            <div className="space-y-2">
              {candidates.map(m => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fe = m.franchisee_profiles as any
                return (
                  <Link key={m.id} href={`/admin/franchisees/${fe?.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line-2 px-3.5 py-2.5 hover:bg-surface-2 transition-colors">
                    <Avatar name={fe?.profiles?.full_name} size="md" />
                    <span className="text-sm font-medium text-ink flex-1 truncate">{fe?.profiles?.full_name || 'Unknown'}</span>
                    {m.score > 0 && <span className="text-xs font-semibold text-ff-green bg-ff-green/10 rounded-full px-2.5 py-1">{m.score}%</span>}
                  </Link>
                )
              })}
            </div>
          )}
        </Section>
      </div>
    </DrawerHost>
  )
}
