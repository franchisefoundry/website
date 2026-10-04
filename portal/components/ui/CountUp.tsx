'use client'

import { useEffect, useState } from 'react'

/** Animates a number from 0 → value on mount (eased). Static under reduced-motion. */
export function CountUp({
  value,
  suffix = '',
  duration = 1000,
  className,
}: {
  value: number
  suffix?: string
  duration?: number
  className?: string
}) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span className={className}>{n}{suffix}</span>
}
