import Link from 'next/link'

export default function PreviewBanner({ role }: { role: 'franchisee' | 'franchisor' }) {
  const label = role === 'franchisee' ? 'Franchisee' : 'Franchisor'

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          Preview mode
        </span>
        <span className="text-xs text-amber-700">
          You&apos;re viewing the <strong>{label}</strong> portal as an admin.
        </span>
      </div>
      <Link
        href="/admin"
        className="text-xs font-medium text-amber-700 hover:text-amber-900 underline"
      >
        ← Back to admin
      </Link>
    </div>
  )
}
