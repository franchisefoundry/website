import { ComingSoon } from '@/components/client/ComingSoon'
import { CalendarIcon } from '@/components/icons'

export default function Page() {
  return <ComingSoon title="Meetings" description="Your calls with the Franchise Foundry team." blurb="See and book your upcoming calls and candidate introductions here. In build." icon={<CalendarIcon className="w-7 h-7" />} />
}
