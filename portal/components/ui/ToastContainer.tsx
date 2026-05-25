'use client'

import { useEffect, useState } from 'react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as ToastItem
      setToasts(prev => [...prev, detail])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== detail.id))
      }, 3500)
    }
    window.addEventListener('app:toast', handler)
    return () => window.removeEventListener('app:toast', handler)
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 pl-4 pr-5 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-auto
            ${t.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}
        >
          {t.type === 'success' && (
            <span className="w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center shrink-0">
              <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
          {t.type === 'error' && <span className="shrink-0 font-bold">✕</span>}
          {t.type === 'info' && <span className="shrink-0 text-sky-400">ℹ</span>}
          {t.message}
        </div>
      ))}
    </div>
  )
}
