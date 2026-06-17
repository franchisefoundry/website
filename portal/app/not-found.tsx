import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full">
        <p className="text-5xl font-bold tracking-tight text-brand-green mb-2">404</p>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-7 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          Back to portal
        </Link>
      </div>
    </div>
  )
}
