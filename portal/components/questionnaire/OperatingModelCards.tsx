'use client'

const OPTIONS = [
  {
    val: 'owner-operator',
    emoji: '👤',
    title: 'Owner-operator',
    desc: 'Franchisee must be hands-on and actively run the business day-to-day',
  },
  {
    val: 'hire-manager',
    emoji: '👔',
    title: 'Semi-passive',
    desc: 'Franchisee can hire a manager — presence required but not full-time',
  },
  {
    val: 'either',
    emoji: '🔄',
    title: 'Either works',
    desc: 'We accept both owner-operators and those who hire in management',
  },
]

interface Props {
  value: string
  onChange: (v: string) => void
  variant?: 'dark' | 'light'
  readOnly?: boolean
}

export function OperatingModelCards({ value, onChange, variant = 'light', readOnly = false }: Props) {
  const accent = variant === 'dark' ? '#3a4a3a' : 'var(--color-brand-green, #3a4a3a)'

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {OPTIONS.map(opt => {
        const isSelected = value === opt.val
        return (
          <button
            key={opt.val}
            type="button"
            onClick={() => !readOnly && onChange(opt.val)}
            disabled={readOnly}
            className={[
              'text-left p-4 rounded-xl border-2 transition-all',
              isSelected
                ? 'shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300',
              readOnly ? 'cursor-default' : 'cursor-pointer',
            ].join(' ')}
            style={isSelected ? { borderColor: accent, backgroundColor: `${accent}10` } : {}}
          >
            <div className="text-2xl mb-2">{opt.emoji}</div>
            <p className="text-sm font-semibold text-slate-800 mb-1">{opt.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{opt.desc}</p>
            {isSelected && (
              <div className="mt-3 flex items-center gap-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: accent }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <polyline points="1,4 3,6 7,2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-xs font-semibold" style={{ color: accent }}>Selected</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
