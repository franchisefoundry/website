import { PageHeader } from '@/components/page-header'
import AddBrandForm from './AddBrandForm'

export default function NewBrandPage() {
  return (
    <div>
      <PageHeader
        title="Add brand"
        description="Create a brand profile and send an invite to the franchisor in one step."
      />
      <AddBrandForm />
    </div>
  )
}
