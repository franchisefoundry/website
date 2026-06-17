import { HeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function FranchisorLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <StatsSkeleton count={3} />
      <TableSkeleton rows={5} />
    </div>
  )
}
