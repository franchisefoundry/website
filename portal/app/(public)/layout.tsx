import Image from 'next/image'
import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      {/* Navbar — matches website */}
      <nav style={{ background: '#3a4a3a', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 40px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="https://franchisefoundry.co.uk">
            <Image src="/logo-white.png" alt="Franchise Foundry" width={160} height={42} className="object-contain" priority />
          </Link>
          <Link
            href="https://franchisefoundry.co.uk"
            style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}
          >
            ← Back to website
          </Link>
        </div>
      </nav>
      <main>{children}</main>
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px 40px', display: 'flex', justifyContent: 'center', gap: 24 }}>
        <Link
          href="/privacy"
          style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          Privacy Policy
        </Link>
        <a
          href="mailto:connect@franchisefoundry.co.uk"
          style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          Contact us
        </a>
      </footer>
    </div>
  )
}
