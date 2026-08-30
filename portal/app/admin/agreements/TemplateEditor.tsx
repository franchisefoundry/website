'use client'

import { useState, useRef } from 'react'
import AgreementDocument from '@/components/AgreementDocument'

interface Agreement {
  id: string
  title: string
  content: string
  version: number
  updated_at: string
}

export default function TemplateEditor({ initial }: { initial: Agreement | null }) {
  const [title, setTitle] = useState(initial?.title ?? 'Franchise Agreement')
  const [content, setContent] = useState(initial?.content ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/agreements/template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error ?? 'Failed to save')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDocxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/agreements/parse-docx', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) { alert('Failed to parse document'); return }
      const { markdown } = await res.json()
      setContent(markdown)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-ink-3 mb-1">Document title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
        />
      </div>

      {/* Upload .docx */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-sm px-4 py-2 border border-line rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Importing…' : 'Import from .docx'}
        </button>
        <span className="text-xs text-ink-3">Replaces current content with the imported text</span>
        <input
          ref={fileRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleDocxUpload}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-line">
        {(['edit', 'preview'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-ff-green text-ff-green'
                : 'border-transparent text-ink-3 hover:text-ink-2'
            }`}
          >
            {t}
          </button>
        ))}
        {initial && (
          <span className="ml-auto text-xs text-ink-3 self-center pr-1">
            Current: v{initial.version}
          </span>
        )}
      </div>

      {/* Editor / Preview */}
      {tab === 'edit' ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={32}
          spellCheck={false}
          placeholder={`# Franchise Agreement\n\n## 1. Parties\n\nThis agreement is between...\n\n## 2. Term\n\n...`}
          className="w-full font-mono text-sm border border-line rounded-lg px-4 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-ff-green placeholder:text-ink-3"
        />
      ) : (
        <AgreementDocument
          title={title}
          version={(initial?.version ?? 0) + 1}
          content={content}
        />
      )}

      <p className="text-xs text-ink-3">
        Use Markdown: <code className="bg-surface-2 px-1 rounded"># Heading</code>,{' '}
        <code className="bg-surface-2 px-1 rounded">## Section</code>,{' '}
        <code className="bg-surface-2 px-1 rounded">**bold**</code>,{' '}
        <code className="bg-surface-2 px-1 rounded">- list item</code>.
        Saving creates a new version; previous versions are preserved.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="bg-ff-green hover:bg-ff-green-deep text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save & publish'}
        </button>
        {saved && <span className="text-sm text-ff-green font-medium">✓ Saved</span>}
      </div>
    </div>
  )
}
