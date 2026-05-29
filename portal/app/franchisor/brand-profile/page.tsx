import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/page-header'
import BrandProfileForm from './brand-profile-form'
import Link from 'next/link'
import { cookies } from 'next/headers'

export default async function BrandProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const cookieStore = await cookies()
  const previewAs    = profile?.role === 'admin'      ? cookieStore.get('ff_preview_as')?.value     : null
  const activeBrandId = profile?.role === 'franchisor' ? cookieStore.get('ff_active_brand_id')?.value : null

  const { data: brandProfile } = previewAs
    ? await admin.from('franchisor_profiles').select('*').eq('id', previewAs).single()
    : activeBrandId
      ? await supabase.from('franchisor_profiles').select('*').eq('id', activeBrandId).single()
      : await supabase.from('franchisor_profiles').select('*').eq('user_id', user!.id)
          .order('created_at', { ascending: true }).limit(1).single()

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
