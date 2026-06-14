'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'ff_cookie_notice_dismissed'

export default function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[9998]"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4">
        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          This portal uses essential cookies to keep you securely signed in. No advertising
          or tracking cookies are used.{' '}
          <Link href="/privacy" className="text-brand-green hover:underline font-medium">
            Privacy policy
          </Link>
        </p>
        <button
          onClick={dismiss}
          className="w-full text-xs font-medium bg-brand-green text-white rounded-lg px-3 py-2 hover:bg-brand-green/90 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
