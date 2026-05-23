'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SectionRow, QuestionRow } from './page'

const INPUT_TYPE_LABELS: Record<string, string> = {
  textarea:    'Text',
  multiselect: 'Multi-select',
  yes_no:      'Yes / No',
  rating:      'Rating 1–10',
  select_one:  'Single select',
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      {INPUT_TYPE_LABELS[type] ?? type}
    </span>
  )
}

interface AddForm {
  question_text: string
  input_type: string
  options_raw: string // comma-separated for multiselect/select_one
}

const defaultAdd: AddForm = { question_text: '', input_type: 'textarea', options_raw: '' }

export default function TemplateEditor({ sections }: { sections: SectionRow[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editOptionsRaw, setEditOptionsRaw] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addingToSection, setAddingToSection] = useState<number | null>(null)
  const [addForm, setAddForm] = useState<AddForm>(defaultAdd)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(q: QuestionRow) {
    setEditingId(q.id)
    setEditText(q.question_text)
    setEditOptionsRaw((q.options ?? []).join(', '))
    setError(null)
  }

  async function saveEdit(q: QuestionRow) {
    setSaving(true)
    setError(null)
    const options = ['multiselect', 'select_one'].includes(q.input_type)
      ? editOptionsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined
    const res = await fetch(`/api/admin/questionnaire-template/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: editText, ...(options !== undefined ? { options } : {}) }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    setEditingId(null)
    router.refresh()
  }

  async function deleteQuestion(id: string) {
    setSaving(true)
    const res = await fetch(`/api/admin/questionnaire-template/${id}`, { method: 'DELETE' })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    setDeletingId(null)
    router.refresh()
  }

  async function addQuestion(sectionId: number) {
    if (!addForm.question_text.trim()) return
    setSaving(true)
    setError(null)
    const options = ['multiselect', 'select_one'].includes(addForm.input_type)
      ? addForm.options_raw.split(',').map(s => s.trim()).filter(Boolean)
      : undefined
    const res = await fetch('/api/admin/questionnaire-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section_id: sectionId,
        question_text: addForm.question_text.trim(),
        input_type: addForm.input_type,
        options,
      }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    setAddingToSection(null)
    setAddForm(defaultAdd)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      {sections.map(section => (
        <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">{section.id}. {section.title}</h2>
            <span className="text-xs text-slate-400">{section.questions.length} question{section.questions.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Questions */}
          <div className="divide-y divide-slate-100">
            {section.questions.map(q => (
              <div key={q.id} className="px-5 py-3.5">
                {editingId === q.id ? (
                  /* Editing mode */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="w-full px-3 py-1.5 border border-brand-green rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                      autoFocus
                    />
                    {['multiselect', 'select_one'].includes(q.input_type) && (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Options (comma-separated)</label>
                        <input
                          type="text"
                          value={editOptionsRaw}
                          onChange={e => setEditOptionsRaw(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                          placeholder="Option A, Option B, Option C"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(q)} disabled={saving || !editText.trim()}
                        className="px-3 py-1 text-xs font-medium bg-brand-green text-white rounded-lg disabled:opacity-60">
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs font-medium border border-slate-300 text-slate-600 rounded-lg">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : deletingId === q.id ? (
                  /* Delete confirm */
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-red-600 font-medium flex-1">Remove &ldquo;{q.question_text}&rdquo;?</p>
                    <button onClick={() => deleteQuestion(q.id)} disabled={saving}
                      className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-lg disabled:opacity-60">
                      {saving ? 'Removing…' : 'Remove'}
                    </button>
                    <button onClick={() => setDeletingId(null)}
                      className="px-3 py-1 text-xs font-medium border border-slate-300 text-slate-600 rounded-lg">
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {q.is_profile_linked && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            🔒 Profile-linked
                          </span>
                        )}
                        <TypeBadge type={q.input_type} />
                      </div>
                      <p className="text-sm text-slate-800 mt-1">{q.question_text}</p>
                      {q.options && q.options.length > 0 && (
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          Options: {q.options.join(' · ')}
                        </p>
                      )}
                    </div>
                    {!q.is_profile_linked && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => startEdit(q)}
                          className="px-2.5 py-1 text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingId(q.id)}
                          className="px-2.5 py-1 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add question */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            {addingToSection === section.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={addForm.question_text}
                  onChange={e => setAddForm(f => ({ ...f, question_text: e.target.value }))}
                  placeholder="Question text…"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  autoFocus
                />
                <div className="flex gap-2">
                  <select
                    value={addForm.input_type}
                    onChange={e => setAddForm(f => ({ ...f, input_type: e.target.value }))}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                  >
                    {Object.entries(INPUT_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                {['multiselect', 'select_one'].includes(addForm.input_type) && (
                  <input
                    type="text"
                    value={addForm.options_raw}
                    onChange={e => setAddForm(f => ({ ...f, options_raw: e.target.value }))}
                    placeholder="Options (comma-separated)"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => addQuestion(section.id)}
                    disabled={saving || !addForm.question_text.trim()}
                    className="px-3 py-1 text-xs font-medium bg-brand-green text-white rounded-lg disabled:opacity-60"
                  >
                    {saving ? 'Adding…' : 'Add question'}
                  </button>
                  <button
                    onClick={() => { setAddingToSection(null); setAddForm(defaultAdd) }}
                    className="px-3 py-1 text-xs font-medium border border-slate-300 text-slate-600 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setAddingToSection(section.id); setAddForm(defaultAdd) }}
                className="text-xs text-brand-green hover:text-brand-green-dark font-medium flex items-center gap-1 transition-colors"
              >
                <span className="text-base leading-none">+</span> Add question to this section
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
