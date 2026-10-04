'use client'

import { useState } from 'react'
import TemplateEditor from '@/app/admin/agreements/TemplateEditor'
import { cn } from '@/lib/utils'
import { PlusIcon } from '@/components/icons'

export interface TemplateFull {
  id: string
  title: string
  content: string
  version: number
  updated_at: string
  template_key: string
  name: string
}

/** Manage multiple agreement templates — a list + New template, editing the
 *  selected one. Send picks from these in the Send tab. */
export function TemplatesManager({ templates }: { templates: TemplateFull[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(templates[0]?.template_key ?? null)
  const [creating, setCreating] = useState(templates.length === 0)
  const selected = templates.find(t => t.template_key === selectedKey) ?? null

  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-5 items-start">
      <div className="space-y-1">
        {templates.map(t => (
          <button key={t.template_key} type="button" onClick={() => { setSelectedKey(t.template_key); setCreating(false) }}
            className={cn('w-full text-left rounded-xl px-3 py-2.5 transition-colors', !creating && selectedKey === t.template_key ? 'bg-ff-green/10 text-ff-green' : 'text-ink-2 hover:bg-surface-2')}>
            <p className="text-sm font-medium truncate">{t.name}</p>
            <p className="text-[11px] text-ink-3">Version {t.version}</p>
          </button>
        ))}
        <button type="button" onClick={() => setCreating(true)}
          className={cn('w-full flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors', creating ? 'bg-ff-green/10 text-ff-green' : 'text-ink-3 hover:bg-surface-2')}>
          <PlusIcon className="w-4 h-4" /> New template
        </button>
      </div>
      <div className="min-w-0">
        {creating
          ? <TemplateEditor key="new" initial={null} />
          : selected
            ? <TemplateEditor key={selected.template_key} initial={selected} />
            : <p className="text-sm text-ink-3">Select a template on the left, or create a new one.</p>}
      </div>
    </div>
  )
}
