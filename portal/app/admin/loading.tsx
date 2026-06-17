import { HeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <StatsSkeleton count={4} />
      <TableSkeleton rows={6} />
    </div>
  )
}
