import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/page-header'
import BrandProfileForm from './brand-profile-form'
import Link from 'next/link'

export default async function BrandProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: brandProfile } = await supabase
    .from('franchisor_profiles')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return (
    <div>
      <PageHeader
        title="Brand profile"
        description="This information is used to match your brand with the right franchisee candidates."
        action={
          <Link
            href="/franchisor/questionnaire"
            className="text-sm text-slate-500 border border-slate-300 hover:border-slate-400 px-4 py-2 rounded-lg transition-colors"
          >
            Edit questionnaire →
          </Link>
        }
      />
      <BrandProfileForm brandProfile={brandProfile} userId={user!.id} />
    </div>
  )
}
