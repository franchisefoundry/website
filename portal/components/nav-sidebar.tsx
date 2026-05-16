'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, initials } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/types'

interface NavItem {
  label: string
  href: string
  icon: string
}

const adminNav: NavItem[] = [
  { label: 'Dashboard',     href: '/admin',                 icon: '▪' },
  { label: 'Franchisees',   href: '/admin/franchisees',     icon: '▪' },
  { label: 'Franchisors',   href: '/admin/franchisors',     icon: '▪' },
  { label: 'Matches',       href: '/admin/matches',         icon: '▪' },
  { label: 'Intro Requests',href: '/admin/intro-requests',  icon: '▪' },
]

const franchiseeNav: NavItem[] = [
  { label: 'Dashboard',  href: '/franchisee',          icon: '▪' },
  { label: 'My Matches', href: '/franchisee/matches',  icon: '▪' },
  { label: 'My Profile', href: '/franchisee/profile',  icon: '▪' },
]

const franchisorNav: NavItem[] = [
  { label: 'Dashboard',      href: '/franchisor',                  icon: '▪' },
  { label: 'Brand Profile',  href: '/franchisor/brand-profile',    icon: '▪' },
]

function navForRole(role: string): NavItem[] {
  if (role === 'admin')      return adminNav
  if (role === 'franchisee') return franchiseeNav
  if (role === 'franchisor') return franchisorNav
  return []
}

interface NavSidebarProps {
  profile: Profile
}

export function NavSidebar({ profile }: NavSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = navForRole(profile.role)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabel = profile.role === 'admin'
    ? 'Admin'
    : profile.role === 'franchisor'
    ? 'Franchisor'
    : 'Franchisee'

  return (
    <aside className="w-60 min-h-screen bg-brand-green flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-green-dark">
        <Image
          src="/logo-white.png"
          alt="Franchise Foundry"
          width={160}
          height={42}
          className="object-contain"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(item => {
          const active = pathname === item.href || (item.href !== `/${profile.role}` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-brand-green-dark pt-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold">
            {initials(profile.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{profile.full_name || 'Account'}</p>
            <p className="text-white/50 text-xs">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-white/90 rounded-lg hover:bg-white/10 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
