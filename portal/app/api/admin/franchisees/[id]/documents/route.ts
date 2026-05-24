import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

// GET — list documents for a franchisee profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const user = await assertAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('franchisee_documents')
    .select('*')
    .eq('franchisee_profile_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — record a document after upload (client uploads to Storage, then calls this)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const user = await assertAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { name, file_path, file_size, mime_type, shared_with_franchisor } = body

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('franchisee_documents')
    .insert({
      franchisee_profile_id: id,
      name,
      file_path,
      file_size,
      mime_type,
      shared_with_franchisor: shared_with_franchisor ?? false,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — toggle shared_with_franchisor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: franchiseeId } = await params
  const supabase = await createClient()
  const user = await assertAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { docId, shared_with_franchisor } = await request.json()
  const admin = createAdminClient()
  const { error } = await admin
    .from('franchisee_documents')
    .update({ shared_with_franchisor })
    .eq('id', docId)
    .eq('franchisee_profile_id', franchiseeId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove document record (admin also deletes from Storage client-side)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: franchiseeId } = await params
  const supabase = await createClient()
  const user = await assertAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { docId } = await request.json()
  const admin = createAdminClient()
  const { error } = await admin
    .from('franchisee_documents')
    .delete()
    .eq('id', docId)
    .eq('franchisee_profile_id', franchiseeId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
