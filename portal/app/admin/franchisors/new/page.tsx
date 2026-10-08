import { PageHeader } from '@/components/page-header'
import AddBrandForm from './AddBrandForm'

export default function NewBrandPage() {
  return (
    <div>
      <PageHeader
        title="Add brand"
        description="Only the name is required. Fill in what you know, invite the franchisor now or later."
      />
      <AddBrandForm />
    </div>
  )
}
