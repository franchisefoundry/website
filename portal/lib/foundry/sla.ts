/**
 * Working-hours maths for intro SLAs: Mon–Fri, 09:00–18:00 UK time.
 * Bank holidays are not excluded yet (add a list here when it matters).
 */

const OPEN_HOUR = 9
const CLOSE_HOUR = 18
const STEP_MIN = 5

function londonParts(d: Date): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', weekday: 'short', hour: 'numeric', hourCycle: 'h23',
  }).formatToParts(d)
  const wd = parts.find(p => p.type === 'weekday')?.value ?? 'Mon'
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd)
  return { weekday, hour }
}

export function isWorkingTime(d: Date): boolean {
  const { weekday, hour } = londonParts(d)
  return weekday >= 1 && weekday <= 5 && hour >= OPEN_HOUR && hour < CLOSE_HOUR
}

/** `from` plus `hours` of working time, in 5-minute steps. */
export function addWorkingHours(from: Date, hours: number): Date {
  let remaining = Math.round(hours * 60)
  const t = new Date(from.getTime())
  // Guard: at most ~3 weeks of stepping, whatever the input.
  for (let i = 0; remaining > 0 && i < 6_000; i++) {
    if (isWorkingTime(t)) remaining -= STEP_MIN
    t.setTime(t.getTime() + STEP_MIN * 60_000)
  }
  return t
}

/** Brief SLA: 4 working hours from the request. */
export function briefDueAt(requestedAt: Date = new Date()): Date {
  return addWorkingHours(requestedAt, 4)
}
