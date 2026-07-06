import Image from 'next/image'
import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-sora), system-ui, sans-serif" }}>
      {/* Navbar — matches website */}
      <nav className="sticky top-0 z-[100] border-b border-white/10" style={{ background: '#3a4a3a' }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-10 h-16 sm:h-[72px] flex items-center justify-between gap-3">
          <Link href="https://franchisefoundry.co.uk" className="flex-shrink-0">
            <Image src="/logo-white.png" alt="Franchise Foundry" width={160} height={42} className="object-contain w-[120px] sm:w-[160px] h-auto" priority />
          </Link>
          <Link
            href="https://franchisefoundry.co.uk"
            className="text-white/75 text-sm font-medium whitespace-nowrap flex-shrink-0 hover:text-white transition-colors"
          >
            <span className="sm:hidden">← Back</span>
            <span className="hidden sm:inline">← Back to website</span>
          </Link>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="flex justify-center gap-6 px-4 sm:px-10 py-5 border-t border-white/10" style={{ background: '#3a4a3a' }}>
        <Link href="/privacy" className="text-white/50 hover:text-white/80 text-xs transition-colors">
          Privacy Policy
        </Link>
        <a href="mailto:connect@franchisefoundry.co.uk" className="text-white/50 hover:text-white/80 text-xs transition-colors">
          Contact us
        </a>
      </footer>
    </div>
  )
}
