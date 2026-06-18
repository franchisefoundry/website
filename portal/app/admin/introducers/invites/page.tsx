import { PageHeader } from '@/components/page-header'
import RoleInvites from '@/components/admin/RoleInvites'
import InviteAgentButton from '../InviteIntroducerButton'

export default function AgentInvitesPage() {
  return (
    <div>
      <PageHeader
        title="Agent invites"
        description="Pending and accepted invitations for agents."
        action={<InviteAgentButton />}
      />
      <RoleInvites role="introducer" />
    </div>
  )
}
