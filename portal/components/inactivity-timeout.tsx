'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  /** Total idle time before sign-out in milliseconds. Default: 30 minutes */
  timeoutMs?: number
  /** How long before sign-out to show the warning modal. Default: 2 minutes */
  warningMs?: number
}

export default function InactivityTimeout({
  timeoutMs = 30 * 60 * 1000,
  warningMs = 2 * 60 * 1000,
}: Props) {
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  // Refs so event handlers always have fresh values without re-mounting
  const showWarningRef = useRef(false)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSigning = useRef(false)
  // Store stable callbacks in refs so the single-mount effect can reference them
  const signOutRef = useRef<() => void>(() => {})
  const resetTimerRef = useRef<() => void>(() => {})

  useEffect(() => {
    function clearAll() {
      if (warnTimer.current) clearTimeout(warnTimer.current)
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (countdownInterval.current) clearInterval(countdownInterval.current)
    }

    async function signOut() {
      if (isSigning.current) return
      isSigning.current = true
      clearAll()
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace('/login?reason=idle')
    }

    function startCountdown() {
      showWarningRef.current = true
      setShowWarning(true)
      setSecondsLeft(Math.round(warningMs / 1000))

      countdownInterval.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      idleTimer.current = setTimeout(signOut, warningMs)
    }

    function resetTimer() {
      clearAll()
      showWarningRef.current = false
      setShowWarning(false)
      isSigning.current = false

      warnTimer.current = setTimeout(startCountdown, timeoutMs - warningMs)
    }

    // Expose to the "Stay signed in" button via refs
    signOutRef.current = signOut
    resetTimerRef.current = resetTimer

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

    function handleActivity() {
      // Once the warning is showing, only the button can reset — not mouse movement
      if (!showWarningRef.current) resetTimer()
    }

    resetTimer()
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))

    return () => {
      clearAll()
      events.forEach(e => window.removeEventListener(e, handleActivity))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount once — all state accessed via refs

  if (!showWarning) return null

  const minutes = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timeLabel = minutes > 0
    ? `${minutes}m ${secs.toString().padStart(2, '0')}s`
    : `${secondsLeft}s`

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 mx-4 max-w-sm w-full text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-slate-900 mb-1">Still there?</h2>
        <p className="text-sm text-slate-500 mb-5">
          You&apos;ve been inactive for a while. For your security, you&apos;ll be signed out in{' '}
          <span className="font-semibold tabular-nums text-slate-700">{timeLabel}</span>.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => resetTimerRef.current()}
            className="w-full px-4 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-brand-green/90 transition-colors"
          >
            Stay signed in
          </button>
          <button
            onClick={() => signOutRef.current()}
            className="w-full px-4 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Sign out now
          </button>
        </div>
      </div>
    </div>
  )
}
