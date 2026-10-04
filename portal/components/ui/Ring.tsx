'use client'

import { useEffect, useId, useState } from 'react'

/**
 * Animated progress ring with a green→gold gradient stroke and a centre label.
 * Sweeps to `pct` on mount; static under prefers-reduced-motion.
 */
export function Ring({
  pct,
  size = 80,
  stroke = 9,
  label,
}: {
  pct: number
  size?: number
  stroke?: number
  label?: string
}) {
  const id = useId().replace(/:/g, '')
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOffset(circ * (1 - pct / 100))
      return
    }
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOffset(circ * (1 - pct / 100))))
    return () => cancelAnimationFrame(raf)
  }, [pct, circ])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <defs>
        <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--ff-green)" />
          <stop offset="1" stopColor="var(--ff-gold)" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ff-border-2)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={`url(#ring-${id})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(0.22,1,0.36,1)' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size * 0.24, fontWeight: 800, fill: 'var(--ff-ink)', fontVariantNumeric: 'tabular-nums' }}>
        {label ?? `${pct}%`}
      </text>
    </svg>
  )
}
