import { ComingSoon } from '@/components/client/ComingSoon'
import { AgreementIcon } from '@/components/icons'

export default function AgreementPage() {
  return (
    <ComingSoon
      title="Agreement"
      description="Review and e-sign your franchise agreement."
      blurb="Your franchise agreement, comments and one-tap e-signature will live here. We're putting the finishing touches on it — the FF team will be in touch when yours is ready."
      icon={<AgreementIcon className="w-7 h-7" />}
    />
  )
}
