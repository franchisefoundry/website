import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmins } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'franchisor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { body, sectionRef } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Comment body required' }, { status: 400 })

  const admin = createAdminClient()

  // Get franchisor profile
  const { data: fp } = await admin
    .from('franchisor_profiles')
    .select('id, brand_name')
    .eq('user_id', user.id)
    .single()
  if (!fp) return NextResponse.json({ error: 'Franchisor profile not found' }, { status: 404 })

  // Get the franchisor agreement
  const { data: fa } = await admin
    .from('franchisor_agreements')
    .select('id, status')
    .eq('franchisor_profile_id', fp.id)
    .single()

  if (!fa) return NextResponse.json({ error: 'No agreement found' }, { status: 404 })
  if (fa.status === 'signed') return NextResponse.json({ error: 'Cannot comment on a signed agreement' }, { status: 400 })

  const { data: comment, error } = await admin
    .from('agreement_comments')
    .insert({
      franchisor_agreement_id: fa.id,
      author_id: user.id,
      body: body.trim(),
      section_ref: sectionRef?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const brandLabel = fp.brand_name || profile.full_name || profile.email || 'A franchisor'
  await notifyAdmins({
    type: 'agreement_comment',
    title: 'Agreement comment',
    body: `${brandLabel} left a comment on their agreement${sectionRef ? ` (${sectionRef})` : ''}.`,
    link: `/admin/agreements`,
  })

  return NextResponse.json({ comment })
}
