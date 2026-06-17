'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface to server logs / monitoring
    console.error('[app error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full">
        <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h1>
        <p className="text-sm text-slate-500 mb-7 leading-relaxed">
          An unexpected error occurred. You can try again, or head back to the portal.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Back to portal
          </a>
        </div>
      </div>
    </div>
  )
}
