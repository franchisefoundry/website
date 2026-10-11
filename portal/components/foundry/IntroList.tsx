'use client'

/**
 * The intro list: a basket of partners to be introduced to in one go.
 * Lives in localStorage per user, so it survives page changes and visits.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { beacon } from './client'

export interface ListItem {
  id: string
  slug: string
  name: string
  categoryLabel: string
  deal: string | null
}

interface IntroListValue {
  items: ListItem[]
  has: (id: string) => boolean
  toggle: (item: ListItem, searchId?: string | null) => void
  remove: (id: string) => void
  clear: () => void
  base: string
}

const Ctx = createContext<IntroListValue | null>(null)

export function IntroListProvider({ viewerId, base, children }: { viewerId: string; base: string; children: React.ReactNode }) {
  const key = `ff_intro_list:${viewerId}`
  const [items, setItems] = useState<ListItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setItems(JSON.parse(raw))
    } catch { /* private mode or bad JSON: start empty */ }
  }, [key])

  const save = useCallback((next: ListItem[]) => {
    setItems(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* ignore */ }
  }, [key])

  const value = useMemo<IntroListValue>(() => ({
    items,
    base,
    has: id => items.some(i => i.id === id),
    toggle: (item, searchId) => {
      if (items.some(i => i.id === item.id)) save(items.filter(i => i.id !== item.id))
      else {
        save([...items, item])
        beacon('add_to_list', item.id, searchId)
      }
    },
    remove: id => save(items.filter(i => i.id !== id)),
    clear: () => save([]),
  }), [items, base, save])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useIntroList(): IntroListValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useIntroList must be used inside IntroListProvider')
  return v
}
