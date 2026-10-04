/** Server-safe helper for admin list views (keep out of 'use client' modules so
 *  server pages can call it). */
export function currentView(view: string | undefined): 'cards' | 'kanban' | 'list' {
  return view === 'kanban' ? 'kanban' : view === 'list' ? 'list' : 'cards'
}
