'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'

function InvitePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return <ErrorCard message="This invite link is invalid. Please contact your administrator." />
  }

  async function handleAccept() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    // Redirect to our confirm handler — it verifies the Supabase token_hash and signs in
    window.location.href = `/auth/confirm?token_hash=${data.token_hash}&type=magiclink`
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>

        <h1 className="text-lg font-semibold text-slate-900 mb-2">You&apos;ve been invited</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Click the button below to access your Franchise Foundry portal. You&apos;ll be signed in securely.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <button
          onClick={handleAccept}
          disabled={loading}
          className="w-full bg-brand-green hover:bg-brand-green/90 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-60"
        >
          {loading ? 'Signing you in…' : 'Access my portal →'}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Didn&apos;t expect this?{' '}
        <a href="mailto:connect@franchisefoundry.co.uk" className="text-brand-green hover:underline">
          Contact us
        </a>
      </p>
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Invalid invite</h1>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <a
          href="/login"
          className="inline-block text-sm font-medium text-brand-green hover:underline"
        >
          Go to login
        </a>
      </div>
    </div>
  )
}

export default function InvitePageWrapper() {
  return (
    <Suspense>
      <InvitePage />
    </Suspense>
  )
}
