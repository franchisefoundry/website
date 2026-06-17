import { HeaderSkeleton, StatsSkeleton, CardGridSkeleton } from '@/components/ui/skeleton'

export default function FranchiseeLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <StatsSkeleton count={3} />
      <CardGridSkeleton count={3} />
    </div>
  )
}
