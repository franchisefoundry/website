'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, initials } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/types'

// A leaf is a direct link; a group is a collapsible section with children
type NavLeaf = { label: string; href: string }
type NavGroup = { label: string; children: NavLeaf[] }
type NavItem = NavLeaf | NavGroup

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

const adminNav: NavItem[] = [
  { label: 'Dashboard',   href: '/admin' },
  { label: 'Leads',       href: '/admin/leads' },
  { label: 'Franchisees', href: '/admin/franchisees' },
  {
    label: 'Franchisors',
    children: [
      { label: 'Franchisors',    href: '/admin/franchisors' },
      { label: 'Questionnaires', href: '/admin/questionnaires' },
      { label: 'Questions',      href: '/admin/questionnaire-template' },
    ],
  },
  { label: 'Matches', href: '/admin/matches' },
  {
    label: 'Marketplace',
    children: [
      { label: 'Partners',  href: '/admin/partners' },
      { label: 'Intros',    href: '/admin/intro-requests' },
    ],
  },
]

const franchiseeNav: NavItem[] = [
  { label: 'Dashboard',   href: '/franchisee' },
  { label: 'My Journey',  href: '/franchisee/matches' },
  { label: 'Marketplace', href: '/franchisee/marketplace' },
  { label: 'My Profile',  href: '/franchisee/profile' },
]

const franchisorNav: NavItem[] = [
  { label: 'Dashboard',  href: '/franchisor' },
  {
    label: 'Brand Profile',
    children: [
      { label: 'Brand Profile',  href: '/franchisor/brand-profile' },
      { label: 'Questionnaire',  href: '/franchisor/questionnaire' },
    ],
  },
  { label: 'Candidates',  href: '/franchisor/matches' },
  { label: 'Marketplace', href: '/franchisor/marketplace' },
  { label: 'My Account',  href: '/franchisor/profile' },
]

function navForRole(role: string): NavItem[] {
  if (role === 'admin')      return adminNav
  if (role === 'franchisee') return franchiseeNav
  if (role === 'franchisor') return franchisorNav
  return []
}

function profileHrefForRole(role: string): string {
  if (role === 'admin')      return '/admin/profile'
  if (role === 'franchisor') return '/franchisor/profile'
  return '/franchisee/profile'
}

function NavGroupItem({
  group,
  pathname,
  role,
  onClose,
}: {
  group: NavGroup
  pathname: string
  role: string
  onClose: () => void
}) {
  const anyChildActive = group.children.some(
    c => pathname === c.href || pathname.startsWith(c.href + '/')
  )
  const [open, setOpen] = useState(anyChildActive)

  // Auto-expand when navigating to a child page (sidebar persists across navigations)
  useEffect(() => {
    if (anyChildActive) setOpen(true)
  }, [anyChildActive])

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          anyChildActive
            ? 'text-white bg-white/10'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
          {group.label}
        </div>
        <svg
          className={cn('w-3.5 h-3.5 opacity-60 transition-transform', open ? 'rotate-180' : '')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {group.children.map(child => {
            const active = pathname === child.href || pathname.startsWith(child.href + '/')
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface NavSidebarProps {
  profile: Profile
}

export function NavSidebar({ profile }: NavSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = navForRole(profile.role)
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const profileHref = profileHrefForRole(profile.role)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avatarUrl = (profile as any).avatar_url as string | null | undefined

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-brand-green flex items-center justify-between px-4 md:hidden z-30 border-b border-white/10">
        <Image
          src="/logo-white.png"
          alt="Franchise Foundry"
          width={120}
          height={32}
          className="object-contain"
          priority
        />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="5"  x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
          </svg>
        </button>
      </div>

      {/* ── Mobile backdrop ────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 w-64 bg-brand-green flex flex-col z-50 transition-transform duration-300',
        'md:static md:w-60 md:min-h-screen md:translate-x-0 md:z-auto md:transition-none',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <Link href={`/${profile.role}`} onClick={() => setMobileOpen(false)}>
            <Image
              src="/logo-white.png"
              alt="Franchise Foundry"
              width={160}
              height={42}
              className="object-contain"
              priority
            />
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="md:hidden text-white/60 hover:text-white text-2xl leading-none ml-3 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item, i) => {
            if (isGroup(item)) {
              return (
                <NavGroupItem
                  key={i}
                  group={item}
                  pathname={pathname}
                  role={profile.role}
                  onClose={() => setMobileOpen(false)}
                />
              )
            }

            const active = pathname === item.href || (item.href !== `/${profile.role}` && pathname.startsWith(item.href + '/'))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Admin preview switcher */}
        {profile.role === 'admin' && (
          <div className="px-3 pb-3 border-t border-white/10 pt-3 flex-shrink-0">
            <p className="px-3 text-white/40 text-xs font-medium mb-1">Preview as</p>
            <Link
              href="/franchisee"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>👤</span> Franchisee view
            </Link>
            <Link
              href="/franchisor"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>🏢</span> Franchisor view
            </Link>
          </div>
        )}

        {/* User */}
        <div className="px-3 pb-4 border-t border-white/10 pt-4 flex-shrink-0">
          <Link
            href={profileHref}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg hover:bg-white/10 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : initials(profile.full_name)
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{profile.full_name || 'Account'}</p>
              <p className="text-white/40 text-xs">Profile &amp; settings</p>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-white/90 rounded-lg hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
