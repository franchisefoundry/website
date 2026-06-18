import { PageHeader } from '@/components/page-header'
import RoleInvites from '@/components/admin/RoleInvites'
import InviteFranchisorButton from '../invite-button'

export default function FranchisorInvitesPage() {
  return (
    <div>
      <PageHeader
        title="Franchisor invites"
        description="Pending and accepted invitations for franchisor brands."
        action={<InviteFranchisorButton />}
      />
      <RoleInvites role="franchisor" />
    </div>
  )
}
