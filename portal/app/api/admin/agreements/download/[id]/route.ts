import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const admin = createAdminClient()

  const { data: fa } = await admin
    .from('franchisor_agreements')
    .select('signed_pdf_path, status, agreements(title)')
    .eq('id', id)
    .single()

  if (!fa || fa.status !== 'signed' || !fa.signed_pdf_path) {
    return NextResponse.json({ error: 'No signed agreement available' }, { status: 404 })
  }

  const { data: fileData, error } = await admin.storage
    .from('documents')
    .download(fa.signed_pdf_path)

  if (error || !fileData) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const buffer = await fileData.arrayBuffer()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const title = ((fa as any).agreements?.title ?? 'Franchise Agreement').replace(/\s+/g, '-')

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${title}-Signed.pdf"`,
    },
  })
}
