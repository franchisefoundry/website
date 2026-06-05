'use client'

import { useState, useRef } from 'react'

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

  // Simple markdown to HTML for preview
  function renderPreview(md: string): string {
    return md
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-5 mb-2">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/^(?!<[hlip])(.+)$/gm, '<p class="mb-3">$1</p>')
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Document title</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
        />
      </div>

      {/* Upload .docx */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-sm px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Importing…' : 'Import from .docx'}
        </button>
        <span className="text-xs text-slate-400">Replaces current content with the imported text</span>
        <input
          ref={fileRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={handleDocxUpload}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['edit', 'preview'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-brand-green text-brand-green'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
        {initial && (
          <span className="ml-auto text-xs text-slate-400 self-center pr-1">
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
          className="w-full font-mono text-sm border border-slate-200 rounded-lg px-4 py-3 resize-y focus:outline-none focus:ring-2 focus:ring-brand-green placeholder:text-slate-300"
        />
      ) : (
        <div
          className="w-full min-h-96 border border-slate-200 rounded-lg px-8 py-6 prose prose-slate max-w-none text-sm overflow-auto bg-white"
          dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
        />
      )}

      <p className="text-xs text-slate-400">
        Use Markdown: <code className="bg-slate-100 px-1 rounded"># Heading</code>,{' '}
        <code className="bg-slate-100 px-1 rounded">## Section</code>,{' '}
        <code className="bg-slate-100 px-1 rounded">**bold**</code>,{' '}
        <code className="bg-slate-100 px-1 rounded">- list item</code>.
        Saving creates a new version; previous versions are preserved.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save & publish'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
      </div>
    </div>
  )
}
