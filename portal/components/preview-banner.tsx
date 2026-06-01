'use client'

import Link from 'next/link'

export default function PreviewBanner({ role }: { role: 'franchisee' | 'franchisor' | 'introducer' }) {
  const label = role === 'franchisee' ? 'Franchisee' : role === 'franchisor' ? 'Franchisor' : 'Agent'

  function exitPreview() {
    // Clear the preview cookie so subsequent admin page visits show their own data
    document.cookie = 'ff_preview_as=; path=/; max-age=0; SameSite=Lax'
  }

  return (
    <div className="bg-violet-50 border-b border-violet-200 px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
          Admin preview
        </span>
        <span className="text-xs text-violet-700">
          You&apos;re viewing the <strong>{label}</strong> portal as this brand would see it.
        </span>
      </div>
      <Link
        href="/admin"
        onClick={exitPreview}
        className="text-xs font-medium text-violet-700 hover:text-violet-900 underline"
      >
        ← Exit preview
      </Link>
    </div>
  )
}
