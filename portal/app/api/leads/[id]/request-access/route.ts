import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('leads')
    .update({ status: 'meeting_requested' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Could not update status.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
