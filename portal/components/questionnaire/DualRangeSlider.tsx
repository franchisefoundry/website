'use client'

import { useRef, useState } from 'react'

export const INVESTMENT_STEPS = [
  5_000, 10_000, 20_000, 30_000, 50_000, 75_000,
  100_000, 150_000, 200_000, 300_000, 400_000, 500_000,
]

const N = INVESTMENT_STEPS.length - 1

function fmt(v: number) {
  if (v >= 500_000) return '£500k+'
  if (v >= 1_000) return `£${Math.round(v / 1_000)}k`
  return `£${v.toLocaleString()}`
}

function nearestIdx(val: number) {
  const exact = INVESTMENT_STEPS.indexOf(val)
  if (exact >= 0) return exact
  return INVESTMENT_STEPS.reduce(
    (best, s, idx) =>
      Math.abs(s - val) < Math.abs(INVESTMENT_STEPS[best] - val) ? idx : best,
    0,
  )
}

interface Props {
  min: number
  max: number
  onChange: (min: number, max: number) => void
  variant?: 'dark' | 'light'
}

export function DualRangeSlider({ min, max, onChange, variant = 'light' }: Props) {
  const accent = variant === 'dark' ? '#3a4a3a' : 'var(--color-brand-green, #3a4a3a)'

  // Live drag positions — stored in refs so changes don't trigger re-renders
  const liveMin = useRef(nearestIdx(min))
  const liveMax = useRef(nearestIdx(max))

  // Which thumb is on top (z-index swap so min can always be grabbed)
  const [minOnTop, setMinOnTop] = useState(false)

  // DOM refs — updated directly for zero-lag visual feedback
  const trackFillRef = useRef<HTMLDivElement>(null)
  const minThumbRef  = useRef<HTMLDivElement>(null)
  const maxThumbRef  = useRef<HTMLDivElement>(null)
  const minLabelRef  = useRef<HTMLParagraphElement>(null)
  const maxLabelRef  = useRef<HTMLParagraphElement>(null)

  function setDOM(minIdx: number, maxIdx: number) {
    const l = (minIdx / N) * 100
    const r = (maxIdx / N) * 100
    if (trackFillRef.current) {
      trackFillRef.current.style.left  = `${l}%`
      trackFillRef.current.style.width = `${r - l}%`
    }
    if (minThumbRef.current) minThumbRef.current.style.left = `${l}%`
    if (maxThumbRef.current) maxThumbRef.current.style.left = `${r}%`
    if (minLabelRef.current) minLabelRef.current.textContent = fmt(INVESTMENT_STEPS[minIdx])
    if (maxLabelRef.current) maxLabelRef.current.textContent = fmt(INVESTMENT_STEPS[maxIdx])
  }

  function commit() {
    onChange(INVESTMENT_STEPS[liveMin.current], INVESTMENT_STEPS[liveMax.current])
  }

  const initL = (liveMin.current / N) * 100
  const initR = (liveMax.current / N) * 100

  return (
    <div className="space-y-4">
      {/* Value display — updated via DOM refs, not React state */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">Minimum</p>
          <p ref={minLabelRef} className="text-2xl font-bold" style={{ color: accent }}>
            {fmt(INVESTMENT_STEPS[liveMin.current])}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-px bg-slate-300" />
          <span className="text-slate-400 text-xs">to</span>
          <div className="w-8 h-px bg-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 mb-0.5">Maximum</p>
          <p ref={maxLabelRef} className="text-2xl font-bold" style={{ color: accent }}>
            {fmt(INVESTMENT_STEPS[liveMax.current])}
          </p>
        </div>
      </div>

      {/* Slider track */}
      <div className="relative h-10 flex items-center">
        {/* Base track */}
        <div className="absolute left-0 right-0 h-2 bg-slate-200 rounded-full">
          {/* Active fill — moved via DOM ref */}
          <div
            ref={trackFillRef}
            className="absolute h-full rounded-full"
            style={{ left: `${initL}%`, width: `${initR - initL}%`, backgroundColor: accent }}
          />
        </div>

        {/* Min thumb — pointer-events-none, positioned via DOM ref */}
        <div
          ref={minThumbRef}
          className="absolute w-5 h-5 bg-white rounded-full shadow-md border-2 pointer-events-none -translate-x-1/2"
          style={{ left: `${initL}%`, borderColor: accent }}
        />
        {/* Max thumb */}
        <div
          ref={maxThumbRef}
          className="absolute w-5 h-5 bg-white rounded-full shadow-md border-2 pointer-events-none -translate-x-1/2"
          style={{ left: `${initR}%`, borderColor: accent }}
        />

        {/* Invisible min input — drives the min thumb */}
        <input
          type="range" min={0} max={N}
          defaultValue={liveMin.current}
          onPointerDown={() => setMinOnTop(true)}
          onChange={e => {
            const v = Math.min(+e.target.value, liveMax.current - 1)
            liveMin.current = v
            setDOM(v, liveMax.current)
          }}
          onPointerUp={commit}
          onKeyUp={commit}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: minOnTop ? 5 : 3 }}
        />
        {/* Invisible max input — drives the max thumb */}
        <input
          type="range" min={0} max={N}
          defaultValue={liveMax.current}
          onPointerDown={() => setMinOnTop(false)}
          onChange={e => {
            const v = Math.max(+e.target.value, liveMin.current + 1)
            liveMax.current = v
            setDOM(liveMin.current, v)
          }}
          onPointerUp={commit}
          onKeyUp={commit}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ zIndex: minOnTop ? 3 : 5 }}
        />
      </div>

      {/* Axis labels */}
      <div className="flex justify-between text-xs text-slate-400 px-0.5">
        <span>£5k</span>
        <span>£50k</span>
        <span>£100k</span>
        <span>£200k</span>
        <span>£500k+</span>
      </div>
    </div>
  )
}
