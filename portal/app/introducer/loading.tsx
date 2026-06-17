import { HeaderSkeleton, StatsSkeleton, TableSkeleton } from '@/components/ui/skeleton'

export default function IntroducerLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <StatsSkeleton count={4} />
      <TableSkeleton rows={5} />
    </div>
  )
}
