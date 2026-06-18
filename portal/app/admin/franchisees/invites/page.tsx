import { PageHeader } from '@/components/page-header'
import RoleInvites from '@/components/admin/RoleInvites'
import InviteFranchiseeButton from '../invite-button'

export default function FranchiseeInvitesPage() {
  return (
    <div>
      <PageHeader
        title="Franchisee invites"
        description="Pending and accepted invitations for franchisees."
        action={<InviteFranchiseeButton />}
      />
      <RoleInvites role="franchisee" />
    </div>
  )
}
