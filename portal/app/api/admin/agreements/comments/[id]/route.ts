import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

/** POST /api/admin/agreements/comments/[id]  { resolved?, reply? }
 *  Admin resolves/reopens a brand's agreement comment (redline), and/or posts a
 *  reply. A reply marks the comment addressed and notifies the brand. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { resolved, reply } = await req.json().catch(() => ({}))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}
  if (typeof resolved === 'boolean') update.resolved = resolved
  const replyText = typeof reply === 'string' ? reply.trim() : ''
  if (replyText) {
    update.admin_reply = replyText.slice(0, 2000)
    update.admin_reply_at = new Date().toISOString()
    update.resolved = true
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('agreement_comments').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the brand when the team posts a reply.
  if (update.admin_reply) {
    try {
      const { data: c } = await admin.from('agreement_comments').select('franchisor_agreement_id').eq('id', id).single()
      const { data: fa } = c ? await admin.from('franchisor_agreements').select('franchisor_profile_id').eq('id', c.franchisor_agreement_id).single() : { data: null }
      const { data: fp } = fa ? await admin.from('franchisor_profiles').select('user_id').eq('id', fa.franchisor_profile_id).single() : { data: null }
      if (fp?.user_id) {
        await notify({
          userId: fp.user_id,
          event: 'agreement_reply',
          title: 'The team replied on your agreement',
          body: replyText.length > 140 ? `${replyText.slice(0, 140)}…` : replyText,
          link: '/franchisor/agreement',
        })
      }
    } catch (e) { console.error('[agreement reply] notify failed', e) }
  }

  return NextResponse.json({ success: true, admin_reply: update.admin_reply ?? null, admin_reply_at: update.admin_reply_at ?? null })
}
