'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Partner, PartnerFeature, PartnerSector, PartnerAudience } from '@/lib/supabase/types'

const SECTORS: { value: PartnerSector; label: string }[] = [
  { value: 'finance',  label: 'Finance' },
  { value: 'property', label: 'Property' },
  { value: 'tech',     label: 'Tech' },
  { value: 'legal',    label: 'Legal' },
  { value: 'other',    label: 'Other' },
]

const AUDIENCES: { value: PartnerAudience; label: string }[] = [
  { value: 'franchisee', label: 'Franchisees only' },
  { value: 'franchisor', label: 'Franchisors only' },
  { value: 'both',       label: 'Both' },
]

type FormState = {
  name: string
  slug: string
  sector: PartnerSector
  audience: PartnerAudience
  tagline: string
  description: string
  logo_url: string
  features: PartnerFeature[]
  is_active: boolean
  display_order: number
}

const emptyForm = (): FormState => ({
  name: '',
  slug: '',
  sector: 'other',
  audience: 'both',
  tagline: '',
  description: '',
  logo_url: '',
  features: [{ label: '', value: '' }],
  is_active: true,
  display_order: 99,
})

function partnerToForm(p: Partner): FormState {
  return {
    name: p.name,
    slug: p.slug,
    sector: p.sector,
    audience: p.audience,
    tagline: p.tagline ?? '',
    description: p.description ?? '',
    logo_url: p.logo_url ?? '',
    features: p.features?.length ? p.features : [{ label: '', value: '' }],
    is_active: p.is_active,
    display_order: p.display_order,
  }
}

interface Props { partners: Partner[] }

export default function PartnersClient({ partners }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null) // 'new' or partner id
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  function openNew() {
    setForm(emptyForm())
    setEditing('new')
    setError(null)
  }

  function openEdit(p: Partner) {
    setForm(partnerToForm(p))
    setEditing(p.id)
    setError(null)
  }

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

  function addFeature() {
    setForm(prev => ({ ...prev, features: [...prev.features, { label: '', value: '' }] }))
  }

  function removeFeature(i: number) {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }))
  }

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
    await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function toggleActive(p: Partner) {
    await fetch(`/api/admin/partners/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !p.is_active }),
    })
    router.refresh()
  }

  const sectorLabel = (s: string) => SECTORS.find(x => x.value === s)?.label ?? s

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={openNew}
          className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Add partner
        </button>
      </div>

      {/* Partner list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Partner</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Sector</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Audience</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {partners.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No partners yet. Add one above.</td></tr>
            )}
            {partners.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.tagline}</p>
                </td>
                <td className="px-6 py-3 capitalize text-slate-600">{sectorLabel(p.sector)}</td>
                <td className="px-6 py-3 capitalize text-slate-600">{p.audience}</td>
                <td className="px-6 py-3">
                  <button onClick={() => toggleActive(p)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(p)} className="text-xs text-brand-green hover:underline">Edit</button>
                  <button onClick={() => deletePartner(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit form panel */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-16 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mb-16">
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900">{editing === 'new' ? 'Add partner' : 'Edit partner'}</h2>
              <button onClick={cancel} className="text-slate-400 hover:text-slate-600 text-xl font-light">×</button>
            </div>

            <div className="px-8 py-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Name *</label>
                  <input value={form.name} onChange={e => {
                    setField('name', e.target.value)
                    if (!form.slug) setField('slug', autoSlug(e.target.value))
                  }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    placeholder="e.g. HSBC Franchise Finance" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Slug</label>
                  <input value={form.slug} onChange={e => setField('slug', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    placeholder="auto-generated from name" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Sector *</label>
                  <select value={form.sector} onChange={e => setField('sector', e.target.value as PartnerSector)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
                    {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Audience *</label>
                  <select value={form.audience} onChange={e => setField('audience', e.target.value as PartnerAudience)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green">
                    {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Tagline</label>
                <input value={form.tagline} onChange={e => setField('tagline', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="One-line description shown on the card" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
                  placeholder="Longer description shown after the card tagline" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Logo</label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {form.logo_url
                      ? <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                      : <span className="text-slate-300 text-xs">No logo</span>
                    }
                  </div>
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
                      >
                        {logoUploading ? 'Uploading…' : form.logo_url ? 'Replace logo' : 'Upload logo'}
                      </button>
                      {form.logo_url && (
                        <button
                          type="button"
                          onClick={() => setField('logo_url', '')}
                          className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF, SVG · max 5 MB</p>
                    {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Key benefits (shown as bullet points)</label>
                  <button type="button" onClick={addFeature} className="text-xs text-brand-green hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {form.features.map((f, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={f.label} onChange={e => setFeature(i, 'label', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="Label (e.g. Exclusive rate)" />
                      <input value={f.value} onChange={e => setFeature(i, 'value', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                        placeholder="Value (e.g. From 4.9% APR)" />
                      {form.features.length > 1 && (
                        <button type="button" onClick={() => removeFeature(i)} className="text-slate-400 hover:text-red-500 px-1">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Display order</label>
                  <input type="number" value={form.display_order} onChange={e => setField('display_order', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-green" />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-green" />
                  <label htmlFor="is_active" className="text-sm text-slate-700 font-medium">Active (visible in marketplace)</label>
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="px-8 py-5 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={cancel} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim()}
                className="px-5 py-2 text-sm font-medium bg-brand-green hover:bg-brand-green-dark text-white rounded-lg transition-colors disabled:opacity-60">
                {saving ? 'Saving…' : editing === 'new' ? 'Add partner' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
