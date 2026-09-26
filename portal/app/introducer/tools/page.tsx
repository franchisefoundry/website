import { ComingSoon } from '@/components/client/ComingSoon'
import { BoltIcon } from '@/components/icons'

export default function ToolsPage() {
  return (
    <ComingSoon
      title="Tools"
      description="Resources to help you find and convert leads."
      blurb="We're building out prospecting and conversion resources here — pitch materials, brand one-pagers and outreach templates. Your referral link lives on your Account page."
      icon={<BoltIcon className="w-7 h-7" />}
    />
  )
}
