import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import EditBrandForm from './EditBrandForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditFranchisorPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: franchisor } = await supabase
    .from('franchisor_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!franchisor) notFound()

  return (
    <div>
      <PageHeader
        title={`Edit: ${franchisor.brand_name || 'Incomplete profile'}`}
        description="Update brand profile details."
      />
      <EditBrandForm franchisor={franchisor} />
    </div>
  )
}
