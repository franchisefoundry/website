'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/tabs'

/**
 * Client tab switcher for a record drawer / page. Panels are server-rendered and
 * passed in; the client just toggles which one is visible.
 */
export function RecordTabs({
  tabs,
}: {
  tabs: { value: string; label: string; count?: number; panel: React.ReactNode }[]
}) {
  const [active, setActive] = useState(tabs[0]?.value)
  return (
    <div>
      <Tabs tabs={tabs.map(t => ({ value: t.value, label: t.label, count: t.count }))} value={active} onChange={setActive} className="mb-4" />
      {tabs.find(t => t.value === active)?.panel}
    </div>
  )
}
