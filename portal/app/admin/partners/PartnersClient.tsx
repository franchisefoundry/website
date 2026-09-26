'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Partner, PartnerFeature, PartnerCategory, PartnerAudience } from '@/lib/supabase/types'
import { PARTNER_CATEGORIES, categoryMeta } from '@/lib/partner-categories'
import {
  PlusIcon, SearchIcon, TagIcon, ChevronDownIcon, CheckIcon,
  MarketplaceIcon, ArrowRightIcon, CloseIcon, BellIcon,
} from '@/components/icons'

const CATEGORIES: { value: PartnerCategory; label: string }[] =
  PARTNER_CATEGORIES.map(c => ({ value: c.value, label: c.label }))

const AUDIENCES: { value: PartnerAudience; label: string }[] = [
  { value: 'franchisee', label: 'Franchisees only' },
  { value: 'franchisor', label: 'Franchisors only' },
  { value: 'both',       label: 'Both' },
]

type StatusFilter = 'all' | 'active' | 'inactive'

type FormState = {
  name: string
  slug: string
  category: PartnerCategory
  audience: PartnerAudience
  tagline: string
  description: string
  logo_url: string
  features: PartnerFeature[]
  offer_text: string
  website: string
  location: string
  is_active: boolean
  display_order: number
}

const emptyForm = (): FormState => ({
  name: '',
  slug: '',
  category: 'other',
  audience: 'both',
  tagline: '',
  description: '',
  logo_url: '',
  features: [{ label: '', value: '' }],
  offer_text: '',
  website: '',
  location: '',
  is_active: true,
  display_order: 99,
})

function partnerToForm(p: Partner): FormState {
  return {
    name: p.name,
    slug: p.slug,
    category: p.category,
    audience: p.audience,
    tagline: p.tagline ?? '',
    description: p.description ?? '',
    logo_url: p.logo_url ?? '',
    features: p.features?.length ? p.features : [{ label: '', value: '' }],
    offer_text: p.offer_text ?? '',
    website: p.website ?? '',
    location: p.location ?? '',
    is_active: p.is_active,
    display_order: p.display_order,
  }
}

const byOrder = (a: Partner, b: Partner) => a.display_order - b.display_order || a.name.localeCompare(b.name)
const audienceLabel = (a: string) => AUDIENCES.find(x => x.value === a)?.label ?? a

interface Props { partners: Partner[]; introRequestCount: number }

export default function PartnersClient({ partners, introRequestCount }: Props) {
  const router = useRouter()
  const [list, setList] = useState<Partner[]>([...partners].sort(byOrder))
  const [editing, setEditing] = useState<string | null>(null) // 'new' or partner id
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Filters
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState<PartnerCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Reconcile local order with server truth after refresh.
  useEffect(() => { setList([...partners].sort(byOrder)) }, [partners])

  const isFiltered = query.trim() !== '' || catFilter !== 'all' || statusFilter !== 'all'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter(p => {
      if (catFilter !== 'all' && p.category !== catFilter) return false
      if (statusFilter === 'active' && !p.is_active) return false
      if (statusFilter === 'inactive' && p.is_active) return false
      if (!q) return true
      return [p.name, p.tagline, categoryMeta(p.category).label]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [list, query, catFilter, statusFilter])

  // Overview stats (always over the full set, not the filtered view)
  const stats = useMemo(() => ({
    active: partners.filter(p => p.is_active).length,
    deals: partners.filter(p => p.offer_text?.trim()).length,
    categories: new Set(partners.map(p => p.category)).size,
  }), [partners])

  function openNew() { setForm(emptyForm()); setEditing('new'); setError(null) }
  function openEdit(p: Partner) { setForm(partnerToForm(p)); setEditing(p.id); setError(null) }
  function cancel() { setEditing(null); setError(null) }

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }
  function setFeature(i: number, field: keyof PartnerFeature, value: string) {
    setForm(prev => {
      const features = [...prev.features]
      features[i] = { ...features[i], [field]: value }
      return { ...prev, features }
    })
  }
  function addFeature() { setForm(prev => ({ ...prev, features: [...prev.features, { label: '', value: '' }] })) }
  function removeFeature(i: number) { setForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) })) }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setLogoError('File must be under 5MB'); return }
    setLogoUploading(true)
    setLogoError(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const slug = form.slug || autoSlug(form.name) || `partner-${Date.now()}`
    const path = `${slug}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('partner-logos').upload(path, file, { upsert: true })
    if (uploadErr) { setLogoError(uploadErr.message); setLogoUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('partner-logos').getPublicUrl(path)
    setField('logo_url', publicUrl + `?t=${Date.now()}`)
    setLogoUploading(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    const payload = {
      ...form,
      features: form.features.filter(f => f.label.trim() || f.value.trim()),
      slug: form.slug || autoSlug(form.name),
    }
    const isNew = editing === 'new'
    const url = isNew ? '/api/admin/partners' : `/api/admin/partners/${editing}`
    const method = isNew ? 'POST' : 'PUT'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
    setEditing(null)
    router.refresh()
  }

  async function deletePartner(id: string) {
    if (!confirm('Delete this partner? This cannot be undone.')) return
    setList(prev => prev.filter(p => p.id !== id))
    await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function toggleActive(p: Partner) {
    setList(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
    await fetch(`/api/admin/partners/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    router.refresh()
  }

  // Swap display_order with the adjacent partner and persist both.
  async function move(id: string, dir: 'up' | 'down') {
    const idx = list.findIndex(p => p.id === id)
    const swap = dir === 'up' ? idx - 1 : idx + 1
    if (idx < 0 || swap < 0 || swap >= list.length) return
    const a = list[idx], b = list[swap]
    const aOrder = a.display_order, bOrder = b.display_order === aOrder ? aOrder + (dir === 'up' ? -1 : 1) : b.display_order
    const next = [...list]
    next[idx] = { ...b, display_order: aOrder }
    next[swap] = { ...a, display_order: bOrder }
    setList(next.sort(byOrder))
    await Promise.all([
      fetch(`/api/admin/partners/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_order: bOrder }) }),
      fetch(`/api/admin/partners/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_order: aOrder }) }),
    ])
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Overview strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={<MarketplaceIcon className="w-5 h-5 text-ff-green" />} value={`${stats.active}/${partners.length}`} label="Active partners" />
        <StatTile icon={<TagIcon className="w-5 h-5 text-ff-gold" />} tint="bg-ff-gold/10" value={stats.deals} label="With Foundry deals" />
        <StatTile icon={<CheckIcon className="w-5 h-5 text-ff-green" />} value={`${stats.categories}/${CATEGORIES.length}`} label="Categories covered" />
        <Link href="/admin/intro-requests" className="group">
          <StatTile
            icon={<BellIcon className="w-5 h-5 text-ff-green" />}
            value={introRequestCount}
            label="Intro requests"
            alert={introRequestCount > 0 ? 'Pending' : undefined}
            chevron
          />
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <label className="flex items-center gap-2.5 bg-white border border-line rounded-lg px-3.5 py-2.5 flex-1 focus-within:ring-2 focus-within:ring-ff-green focus-within:border-ff-green transition-shadow">
          <SearchIcon className="w-4 h-4 text-ink-3 flex-shrink-0" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search partners…"
            className="bg-transparent outline-none text-sm text-ink-2 placeholder:text-ink-3 w-full"
          />
        </label>
        <div className="flex items-center gap-3">
          <Select value={catFilter} onChange={v => setCatFilter(v as PartnerCategory | 'all')}>
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Select value={statusFilter} onChange={v => setStatusFilter(v as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <button onClick={openNew}
            className="inline-flex items-center gap-1.5 bg-ff-green hover:bg-ff-green-deep text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
            <PlusIcon className="w-4 h-4" /> Add partner
          </button>
        </div>
      </div>

      {/* Partner list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-xl border border-line">
          <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-4">
            <MarketplaceIcon className="w-6 h-6 text-ink-3" />
          </div>
          <p className="text-sm font-semibold text-ink-2 mb-1">
            {partners.length === 0 ? 'No partners yet' : 'No partners match'}
          </p>
          <p className="text-xs text-ink-3 leading-relaxed max-w-xs">
            {partners.length === 0 ? 'Add your first marketplace partner to get started.' : 'Try a different search, category or status.'}
          </p>
          {partners.length === 0 && (
            <button onClick={openNew} className="mt-4 inline-flex items-center gap-1.5 bg-ff-green hover:bg-ff-green-deep text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <PlusIcon className="w-4 h-4" /> Add partner
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-line shadow-sm divide-y divide-line-2 overflow-hidden">
          {filtered.map((p, i) => {
            const meta = categoryMeta(p.category)
            return (
              <div key={p.id} className="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-surface-2 transition-colors">
                {/* Reorder — only when the list isn't filtered */}
                {!isFiltered && (
                  <div className="flex flex-col -my-1">
                    <button
                      onClick={() => move(p.id, 'up')}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="text-ink-3 hover:text-ff-green disabled:opacity-30 disabled:hover:text-ink-3 transition-colors"
                    >
                      <ChevronDownIcon className="w-4 h-4 rotate-180" />
                    </button>
                    <button
                      onClick={() => move(p.id, 'down')}
                      disabled={i === filtered.length - 1}
                      aria-label="Move down"
                      className="text-ink-3 hover:text-ff-green disabled:opacity-30 disabled:hover:text-ink-3 transition-colors"
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Logo */}
                <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.logo_url
                    ? <img src={p.logo_url} alt={p.name} className="w-full h-full object-contain" />
                    : <span className="text-ink-3 text-sm font-bold">{p.name.charAt(0)}</span>}
                </div>

                {/* Name + tagline */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink text-sm truncate">{p.name}</p>
                    {p.offer_text?.trim() && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-ff-gold bg-ff-gold/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <TagIcon className="w-2.5 h-2.5" /> Deal
                      </span>
                    )}
                  </div>
                  {p.tagline && <p className="text-xs text-ink-3 truncate">{p.tagline}</p>}
                </div>

                {/* Category pill */}
                <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${meta.pill}`}>
                  <meta.Icon className="w-3 h-3" /> {meta.short}
                </span>

                {/* Audience */}
                <span className="hidden lg:block text-xs text-ink-3 w-28 flex-shrink-0">{audienceLabel(p.audience)}</span>

                {/* Active toggle */}
                <button onClick={() => toggleActive(p)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 transition-colors ${p.is_active ? 'bg-ff-green-soft text-ff-green hover:bg-ff-green-soft' : 'bg-surface-2 text-ink-3 hover:bg-surface-2'}`}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="text-xs font-medium text-ff-green hover:bg-ff-green/10 px-2.5 py-1.5 rounded-lg transition-colors">Edit</button>
                  <button onClick={() => deletePartner(p.id)} aria-label="Delete" className="text-ink-3 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    <CloseIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isFiltered && filtered.length > 0 && (
        <p className="text-xs text-ink-3 text-center">Clear filters to reorder partners.</p>
      )}

      {/* Add / Edit editor with live preview */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mb-16">
            <div className="px-6 sm:px-8 py-5 border-b border-line flex justify-between items-center">
              <h2 className="text-lg font-bold text-ink">{editing === 'new' ? 'Add partner' : 'Edit partner'}</h2>
              <button onClick={cancel} aria-label="Close" className="text-ink-3 hover:text-ink-2 p-1"><CloseIcon className="w-5 h-5" /></button>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px]">
              {/* Form column */}
              <div className="px-6 sm:px-8 py-6 space-y-5 lg:max-h-[68vh] lg:overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Name *</label>
                    <input value={form.name} onChange={e => {
                      setField('name', e.target.value)
                      if (!form.slug) setField('slug', autoSlug(e.target.value))
                    }}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
                      placeholder="e.g. Capital Forge" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Slug</label>
                    <input value={form.slug} onChange={e => setField('slug', e.target.value)}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
                      placeholder="auto-generated from name" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Category *</label>
                    <select value={form.category} onChange={e => setField('category', e.target.value as PartnerCategory)}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Audience *</label>
                    <select value={form.audience} onChange={e => setField('audience', e.target.value as PartnerAudience)}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green">
                      {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Tagline</label>
                  <input value={form.tagline} onChange={e => setField('tagline', e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
                    placeholder="One-line description shown on the card" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Description</label>
                  <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green resize-none"
                    placeholder="Longer description shown after the card tagline" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Foundry deal <span className="font-normal text-ink-3 normal-case">(member-only offer)</span></label>
                  <input value={form.offer_text} onChange={e => setField('offer_text', e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
                    placeholder="e.g. Arrangement fee waived · save ~£1,500" />
                  <p className="text-xs text-ink-3 mt-1">Shown as a gold “deal” badge on the card. Leave blank if there’s no offer.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Website</label>
                    <input value={form.website} onChange={e => setField('website', e.target.value)}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
                      placeholder="e.g. capitalforge.co.uk" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Location</label>
                    <input value={form.location} onChange={e => setField('location', e.target.value)}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
                      placeholder="e.g. Manchester · UK-wide" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl border border-line bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {form.logo_url
                        ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                        : <span className="text-ink-3 text-xs">No logo</span>}
                    </div>
                    <div className="flex-1">
                      <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                          className="px-4 py-2 text-sm border border-line rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-60">
                          {logoUploading ? 'Uploading…' : form.logo_url ? 'Replace logo' : 'Upload logo'}
                        </button>
                        {form.logo_url && (
                          <button type="button" onClick={() => setField('logo_url', '')}
                            className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
                        )}
                      </div>
                      <p className="text-xs text-ink-3 mt-1">JPG, PNG, GIF, SVG · max 5 MB</p>
                      {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Key benefits (shown as bullet points)</label>
                    <button type="button" onClick={addFeature} className="inline-flex items-center gap-1 text-xs text-ff-green hover:underline"><PlusIcon className="w-3 h-3" /> Add</button>
                  </div>
                  <div className="space-y-2">
                    {form.features.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={f.label} onChange={e => setFeature(i, 'label', e.target.value)}
                          className="flex-1 px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
                          placeholder="Label (e.g. From)" />
                        <input value={f.value} onChange={e => setFeature(i, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green"
                          placeholder="Value (e.g. 4.9% APR)" />
                        {form.features.length > 1 && (
                          <button type="button" onClick={() => removeFeature(i)} aria-label="Remove benefit" className="text-ink-3 hover:text-red-500 px-1"><CloseIcon className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-2 mb-1.5 uppercase tracking-wide">Display order</label>
                    <input type="number" value={form.display_order} onChange={e => setField('display_order', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ff-green" />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="w-4 h-4 rounded accent-ff-green" />
                    <label htmlFor="is_active" className="text-sm text-ink-2 font-medium">Active (visible in marketplace)</label>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              </div>

              {/* Live preview column */}
              <div className="border-t lg:border-t-0 lg:border-l border-line bg-surface-2 px-6 py-6 lg:max-h-[68vh] lg:overflow-y-auto">
                <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide mb-3">Live preview — how members see it</p>
                <CardPreview form={form} />
                <p className="text-[11px] text-ink-3 mt-4 leading-relaxed">Updates as you type. Buttons are inactive in preview.</p>
              </div>
            </div>

            <div className="px-6 sm:px-8 py-4 border-t border-line flex justify-end gap-3">
              <button onClick={cancel} className="px-4 py-2 text-sm text-ink-2 border border-line rounded-lg hover:bg-surface-2 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim()}
                className="px-5 py-2 text-sm font-medium bg-ff-green hover:bg-ff-green-deep text-white rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : editing === 'new' ? 'Add partner' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatTile({ icon, value, label, tint = 'bg-ff-green/10', alert, chevron }: {
  icon: React.ReactNode; value: React.ReactNode; label: string; tint?: string; alert?: string; chevron?: boolean
}) {
  return (
    <div className="bg-white border border-line rounded-2xl p-5 hover:shadow-sm transition-all h-full">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tint}`}>{icon}</div>
        {alert && <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{alert}</span>}
        {chevron && !alert && <ArrowRightIcon className="w-4 h-4 text-ink-3" />}
      </div>
      <p className="text-3xl font-bold text-ink tracking-tight tabular-nums">{value}</p>
      <p className="text-sm text-ink-3 mt-0.5">{label}</p>
    </div>
  )
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white border border-line rounded-lg pl-3.5 pr-9 py-2.5 text-sm text-ink-2 focus:outline-none focus:ring-2 focus:ring-ff-green hover:border-line transition-colors cursor-pointer">
        {children}
      </select>
      <ChevronDownIcon className="w-4 h-4 text-ink-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}

// Mirrors the member-facing marketplace card so admins see the real result.
function CardPreview({ form }: { form: FormState }) {
  const meta = categoryMeta(form.category)
  const feats = form.features.filter(f => f.label.trim() || f.value.trim())
  const featured = !!form.offer_text.trim()

  return (
    <div className={`bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden ${featured ? 'border-ff-gold-light' : 'border-line'}`}>
      {featured && <div className="h-[3px] bg-gradient-to-r from-ff-gold to-ff-gold-light" />}
      <div className="p-4 flex items-start gap-3 border-b border-line-2">
        <div className="w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {form.logo_url
            ? <img src={form.logo_url} alt="" className="w-full h-full object-contain" />
            : <span className="text-ink-3 text-base font-bold">{(form.name || 'P').charAt(0)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink text-sm leading-tight">{form.name || 'Partner name'}</p>
          {form.tagline
            ? <p className="text-xs text-ink-3 mt-0.5 line-clamp-2">{form.tagline}</p>
            : <p className="text-xs text-ink-3 mt-0.5 italic">Tagline appears here</p>}
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.pill}`}>
          <meta.Icon className="w-3 h-3" /> {meta.short}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        {form.description
          ? <p className="text-sm text-ink-2 leading-relaxed mb-3 line-clamp-3">{form.description}</p>
          : <p className="text-sm text-ink-3 italic mb-3">Description appears here…</p>}

        {featured && (
          <div className="flex items-start gap-2 bg-ff-gold-light/20 border border-dashed border-ff-gold rounded-lg px-3 py-2 mb-3">
            <TagIcon className="w-3.5 h-3.5 text-ff-gold mt-0.5 flex-shrink-0" />
            <span className="text-xs font-semibold text-ink leading-snug">{form.offer_text}</span>
          </div>
        )}

        {feats.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {feats.slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="text-ff-gold mt-0.5 flex-shrink-0">✦</span>
                <span>
                  {f.label && <strong className="font-semibold text-ink">{f.label}</strong>}
                  {f.label && f.value && <span className="text-ink-3 mx-1">·</span>}
                  {f.value && <span className="text-ink-2">{f.value}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex gap-2">
          <span className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-ff-green text-white opacity-90">
            Request intro <ArrowRightIcon className="w-3 h-3" />
          </span>
          <span className="py-2 px-3 text-xs font-medium text-ink-2 border border-line rounded-lg">Details</span>
        </div>
      </div>
    </div>
  )
}
