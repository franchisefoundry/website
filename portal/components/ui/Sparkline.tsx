/**
 * Minimal sparkline — normalises `points` into a 100×26 viewBox polyline with a
 * soft area fill. Pure SVG; server-renderable.
 */
export function Sparkline({
  points,
  className,
  stroke = 'var(--ff-green)',
  height = 26,
}: {
  points: number[]
  className?: string
  stroke?: string
  height?: number
}) {
  if (!points.length) return null
  const w = 100
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = points.length > 1 ? w / (points.length - 1) : w
  const coords = points.map((p, i) => {
    const x = i * step
    const y = height - 3 - ((p - min) / span) * (height - 6)
    return [x, y] as const
  })
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${height} L0,${height} Z`

  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={className} style={{ width: '100%', height }}>
      <path d={area} fill={stroke} opacity={0.1} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
