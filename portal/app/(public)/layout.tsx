import Image from 'next/image'
import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="https://franchisefoundry.co.uk" className="inline-block">
            <Image
              src="/logo-full.png"
              alt="Franchise Foundry"
              width={160}
              height={42}
              className="object-contain"
              priority
            />
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
    </div>
  )
}
