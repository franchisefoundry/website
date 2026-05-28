'use client'

import { useRef } from 'react'

function valueToColor(v: number): string {
  if (v <= 3) return '#ef4444'
  if (v <= 6) return '#f59e0b'
  return '#22c55e'
}

function getDescription(v: number): string {
  if (v <= 2) return "Needs significant improvement"
  if (v <= 4) return "Below average — room to improve"
  if (v <= 6) return "Average — some tweaks would help"
  if (v <= 8) return "Good — working well with minor refinements"
  return "Excellent — world-class process"
}

interface Props {
  value: number
  onChange: (v: number) => void
  lowLabel?: string
  highLabel?: string
}

export function GradientRating({
  value,
  onChange,
  lowLabel = '😤 Needs work',
  highLabel = '🏆 World-class',
}: Props) {
  const fillRef  = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const descRef  = useRef<HTMLParagraphElement>(null)

  const hasValue = value > 0
  const initPct   = hasValue ? ((value - 1) / 9) * 100 : 0
  const initColor = hasValue ? valueToColor(value) : '#cbd5e1'

  function setDOM(v: number) {
    const pct   = ((v - 1) / 9) * 100
    const color = valueToColor(v)
    if (fillRef.current) {
      fillRef.current.style.width = `${pct}%`
      fillRef.current.style.backgroundColor = color
    }
    if (thumbRef.current) {
      thumbRef.current.style.left        = `${pct}%`
      thumbRef.current.style.borderColor = color
    }
    if (scoreRef.current) {
      scoreRef.current.textContent = `${v}/10`
      scoreRef.current.style.color = color
    }
    if (descRef.current) {
      descRef.current.textContent = `— ${getDescription(v)}`
      descRef.current.style.color = color
    }
  }

  return (
    <div className="space-y-3">
      {/* Live score + description */}
      <div className="flex items-baseline gap-2 min-h-[28px]">
        <span
          ref={scoreRef}
          className="text-2xl font-bold"
          style={{ color: hasValue ? initColor : '#94a3b8' }}
        >
          {hasValue ? `${value}/10` : '—'}
        </span>
        <p
          ref={descRef}
          className="text-sm"
          style={{ color: hasValue ? initColor : '#94a3b8' }}
        >
          {hasValue ? `— ${getDescription(value)}` : 'Drag to rate'}
        </p>
      </div>

      {/* Slider track */}
      <div className="relative h-10 flex items-center">
        {/* Background + gradient track */}
        <div className="absolute left-0 right-0 h-2.5 rounded-full overflow-hidden"
          style={{ background: 'linear-gradient(to right, #fca5a5 0%, #fcd34d 40%, #86efac 100%)', opacity: 0.35 }}
        />
        {/* Filled portion */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2.5 rounded-full"
          ref={fillRef}
          style={{ width: `${initPct}%`, backgroundColor: initColor }}
        />
        {/* Tick marks for each number */}
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <div
            key={n}
            className="absolute w-0.5 h-3 rounded-full bg-white/60 pointer-events-none"
            style={{ left: `${((n-1)/9)*100}%`, top: '50%', transform: 'translate(-50%,-50%)' }}
          />
        ))}
        {/* Thumb */}
        <div
          ref={thumbRef}
          className="absolute w-5 h-5 bg-white rounded-full shadow-md border-2 pointer-events-none -translate-x-1/2"
          style={{ left: `${initPct}%`, borderColor: initColor }}
        />
        {/* Range input — zero-lag via DOM refs */}
        <input
          type="range"
          min={1} max={10} step={1}
          defaultValue={hasValue ? value : 5}
          onChange={e => setDOM(+e.target.value)}
          onPointerUp={e => onChange(+(e.target as HTMLInputElement).value)}
          onKeyUp={e    => onChange(+(e.target as HTMLInputElement).value)}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Tick number labels */}
      <div className="relative h-4">
        {[1,5,10].map(n => (
          <span
            key={n}
            className="absolute text-[10px] text-slate-400 -translate-x-1/2"
            style={{ left: `${((n-1)/9)*100}%` }}
          >
            {n}
          </span>
        ))}
      </div>

      {/* Staggered min / max labels */}
      <div className="relative h-7">
        <span className="absolute left-0 bottom-0 text-xs text-slate-400">{lowLabel}</span>
        <span className="absolute right-0 top-0 text-xs text-slate-400 text-right">{highLabel}</span>
      </div>
    </div>
  )
}
