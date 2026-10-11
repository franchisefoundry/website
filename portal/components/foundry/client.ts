'use client'

import type { SearchResult, PlanContext } from '@/lib/foundry/types'
import type { OffKey } from '@/lib/foundry/parse'

export type SearchResponse = SearchResult & { searchId: string | null; plan: PlanContext; off: OffKey[] }

export async function runSearch(q: string, off: OffKey[], log: boolean, signal?: AbortSignal): Promise<SearchResponse> {
  const res = await fetch('/api/foundry/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, off, log, surface: 'portal' }),
    signal,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'Search failed')
  return res.json()
}

export interface IntroResponse {
  batchId: string | null
  created: { requestId: string; partnerId: string; name: string | null }[]
  skipped: { partnerId: string; name: string | null; reason: 'already_open' | 'unavailable' }[]
  briefBy?: string
}

export async function requestIntros(body: {
  partners: { id: string; need?: string | null }[]
  callTime?: string | null
  searchId?: string | null
  off?: OffKey[]
}): Promise<IntroResponse> {
  const res = await fetch('/api/foundry/intros', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, consent: true }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error ?? 'Could not send your request.')
  return data
}

export function beacon(kind: 'profile_view' | 'add_to_list', partnerId: string, searchId?: string | null) {
  fetch('/api/foundry/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, partnerId, searchId: searchId ?? null }),
    keepalive: true,
  }).catch(() => {})
}

export function briefByLabel(iso?: string): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London', weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true,
  }).replace(':00', '').replace(' am', 'am').replace(' pm', 'pm')
}

export const STAGE_LABEL: Record<string, string> = {
  exploring: 'Exploring', opening: 'Opening', expanding: 'Expanding',
}
