'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Doc {
  id: string
  name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  shared_with_franchisor: boolean
  created_at: string
}

interface Props {
  franchiseeId: string
  initialDocs: Doc[]
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string | null) {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  return '📄'
}

export default function DocumentsPanel({ franchiseeId, initialDocs }: Props) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${franchiseeId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

      // Upload to Storage
      const { error: uploadErr } = await supabase.storage
        .from('franchisee-documents')
        .upload(path, file, { upsert: false })

      if (uploadErr) throw new Error(uploadErr.message)

      // Record in DB via API
      const res = await fetch(`/api/admin/franchisees/${franchiseeId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type || null,
          shared_with_franchisor: false,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to record document')

      setDocs(prev => [json, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function toggleShare(doc: Doc) {
    const next = !doc.shared_with_franchisor
    // Optimistic
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, shared_with_franchisor: next } : d))

    const res = await fetch(`/api/admin/franchisees/${franchiseeId}/documents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: doc.id, shared_with_franchisor: next }),
    })
    if (!res.ok) {
      // Revert on failure
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, shared_with_franchisor: doc.shared_with_franchisor } : d))
    }
  }

  async function deleteDoc(doc: Doc) {
    if (!confirm(`Delete "${doc.name}"?`)) return

    // Optimistic remove
    setDocs(prev => prev.filter(d => d.id !== doc.id))

    try {
      const supabase = createClient()
      // Remove from Storage
      await supabase.storage.from('franchisee-documents').remove([doc.file_path])
      // Remove record from DB
      await fetch(`/api/admin/franchisees/${franchiseeId}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: doc.id }),
      })
    } catch {
      // Re-add if something went wrong
      setDocs(prev => [doc, ...prev])
    }
  }

  async function getDownloadUrl(doc: Doc) {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('franchisee-documents')
      .createSignedUrl(doc.file_path, 60 * 5) // 5-min URL
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          onChange={handleUpload}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv"
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-green hover:text-brand-green transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <span className="animate-spin">⏳</span> Uploading…
            </>
          ) : (
            <>
              <span>+</span> Upload document
            </>
          )}
        </button>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Documents list */}
      {docs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
              <span className="text-lg flex-shrink-0">{fileIcon(doc.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => getDownloadUrl(doc)}
                  className="text-sm font-medium text-slate-700 hover:text-brand-green truncate block text-left transition-colors"
                >
                  {doc.name}
                </button>
                <p className="text-xs text-slate-400">
                  {formatBytes(doc.file_size)}
                  {doc.file_size ? ' · ' : ''}
                  {new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Share toggle */}
              <button
                onClick={() => toggleShare(doc)}
                title={doc.shared_with_franchisor ? 'Visible to franchisor — click to hide' : 'Hidden from franchisor — click to share'}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  doc.shared_with_franchisor
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
              >
                {doc.shared_with_franchisor ? '👁 Shared' : '🔒 Private'}
              </button>

              {/* Delete */}
              <button
                onClick={() => deleteDoc(doc)}
                className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Documents marked <strong>Shared</strong> are visible to the franchisor when this franchisee is matched.
      </p>
    </div>
  )
}
