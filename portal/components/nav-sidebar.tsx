'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, initials } from '@/lib/utils'
import type { Profile } from '@/lib/supabase/types'
import { NotificationBell } from '@/components/notification-bell'
import {
  DashboardIcon, LeadsIcon, FranchiseeIcon, FranchisorIcon,
  MatchIcon, AgreementIcon, MarketplaceIcon, AgentIcon,
  QuestionnaireIcon, SignOutIcon, PlusIcon,
} from '@/components/icons'

// ── Nav type system ──────────────────────────────────────────────────────────
type NavLeaf    = { label: string; href: string; icon?: React.ReactNode }
type NavGroup   = { label: string; icon?: React.ReactNode; children: NavLeaf[] }
type NavDivider = { sectionLabel: string }
type NavItem    = NavLeaf | NavGroup | NavDivider

function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}
function isDivider(item: NavItem): item is NavDivider {
  return 'sectionLabel' in item
}

// ── Nav definitions ──────────────────────────────────────────────────────────
const adminNav: NavItem[] = [
  { sectionLabel: 'Pipeline' },
  { label: 'Dashboard',   href: '/admin',       icon: <DashboardIcon className="w-4 h-4" /> },
  { label: 'Leads',       href: '/admin/leads', icon: <LeadsIcon className="w-4 h-4" /> },
  {
    label: 'Franchisees',
    icon: <FranchiseeIcon className="w-4 h-4" />,
    children: [
      { label: 'Franchisees', href: '/admin/franchisees',         icon: <FranchiseeIcon className="w-3.5 h-3.5" /> },
      { label: 'Invites',     href: '/admin/franchisees/invites', icon: <PlusIcon className="w-3.5 h-3.5" /> },
    ],
  },
  { sectionLabel: 'Brands' },
  {
    label: 'Franchisors',
    icon: <FranchisorIcon className="w-4 h-4" />,
    children: [
      { label: 'Franchisors',    href: '/admin/franchisors',            icon: <FranchisorIcon className="w-3.5 h-3.5" /> },
      { label: 'Questionnaires', href: '/admin/questionnaires',         icon: <QuestionnaireIcon className="w-3.5 h-3.5" /> },
      { label: 'Questions',      href: '/admin/questionnaire-template', icon: <QuestionnaireIcon className="w-3.5 h-3.5" /> },
      { label: 'Invites',        href: '/admin/franchisors/invites',    icon: <PlusIcon className="w-3.5 h-3.5" /> },
    ],
  },
  { label: 'Matches',    href: '/admin/matches',    icon: <MatchIcon className="w-4 h-4" /> },
  { label: 'Agreements', href: '/admin/agreements', icon: <AgreementIcon className="w-4 h-4" /> },
  { sectionLabel: 'More' },
  {
    label: 'Agents',
    icon: <AgentIcon className="w-4 h-4" />,
    children: [
      { label: 'Agents',  href: '/admin/introducers',         icon: <AgentIcon className="w-3.5 h-3.5" /> },
      { label: 'Leads',   href: '/admin/introducer-leads',    icon: <LeadsIcon className="w-3.5 h-3.5" /> },
      { label: 'Invites', href: '/admin/introducers/invites', icon: <PlusIcon className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Marketplace',
    icon: <MarketplaceIcon className="w-4 h-4" />,
    children: [
      { label: 'Partners', href: '/admin/partners',      icon: <MarketplaceIcon className="w-3.5 h-3.5" /> },
      { label: 'Intros',   href: '/admin/intro-requests', icon: <MatchIcon className="w-3.5 h-3.5" /> },
    ],
  },
]

const franchiseeNav: NavItem[] = [
  { label: 'Dashboard',   href: '/franchisee',             icon: <DashboardIcon className="w-4 h-4" /> },
  { label: 'My Journey',  href: '/franchisee/matches',     icon: <MatchIcon className="w-4 h-4" /> },
  { label: 'Marketplace', href: '/franchisee/marketplace', icon: <MarketplaceIcon className="w-4 h-4" /> },
  { label: 'My Profile',  href: '/franchisee/profile',     icon: <FranchiseeIcon className="w-4 h-4" /> },
]

const franchisorNav: NavItem[] = [
  { label: 'Dashboard',  href: '/franchisor',             icon: <DashboardIcon className="w-4 h-4" /> },
  {
    label: 'Brand Profile',
    icon: <FranchisorIcon className="w-4 h-4" />,
    children: [
      { label: 'Brand Profile',  href: '/franchisor/brand-profile', icon: <FranchisorIcon className="w-3.5 h-3.5" /> },
      { label: 'Questionnaire',  href: '/franchisor/questionnaire', icon: <QuestionnaireIcon className="w-3.5 h-3.5" /> },
    ],
  },
  { label: 'Candidates',  href: '/franchisor/matches',     icon: <LeadsIcon className="w-4 h-4" /> },
  { label: 'Marketplace', href: '/franchisor/marketplace', icon: <MarketplaceIcon className="w-4 h-4" /> },
  { label: 'Agreement',   href: '/franchisor/agreement',   icon: <AgreementIcon className="w-4 h-4" /> },
  { label: 'My Account',  href: '/franchisor/profile',     icon: <FranchiseeIcon className="w-4 h-4" /> },
]

const introducerNav: NavItem[] = [
  { label: 'Dashboard',  href: '/introducer',         icon: <DashboardIcon className="w-4 h-4" /> },
  { label: 'My Leads',   href: '/introducer/leads',   icon: <LeadsIcon className="w-4 h-4" /> },
  { label: 'Commission', href: '/introducer/commission', icon: <MatchIcon className="w-4 h-4" /> },
  { label: 'Tools',      href: '/introducer/tools',   icon: <MarketplaceIcon className="w-4 h-4" /> },
  { label: 'My Account', href: '/introducer/profile', icon: <FranchiseeIcon className="w-4 h-4" /> },
]

function navForRole(role: string): NavItem[] {
  if (role === 'admin')      return adminNav
  if (role === 'franchisee') return franchiseeNav
  if (role === 'franchisor') return franchisorNav
  if (role === 'introducer') return introducerNav
  return []
}

function profileHrefForRole(role: string): string {
  if (role === 'admin')      return '/admin/profile'
  if (role === 'franchisor') return '/franchisor/profile'
  if (role === 'introducer') return '/introducer/profile'
  return '/franchisee/profile'
}

function roleLabel(role: string): string {
  if (role === 'admin')      return 'Administrator'
  if (role === 'franchisor') return 'Franchisor'
  if (role === 'introducer') return 'Agent'
  return 'Franchisee'
}

// ── NavGroupItem ─────────────────────────────────────────────────────────────
function NavGroupItem({
  group,
  pathname,
  onClose,
}: {
  group: NavGroup
  pathname: string
  onClose: () => void
}) {
  // Pick only the single most-specific (longest-prefix) matching child, so a
  // nested route like /admin/franchisors/invites doesn't also light up the
  // parent "/admin/franchisors" child.
  const activeChildHref = group.children
    .filter(c => pathname === c.href || pathname.startsWith(c.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  const anyChildActive = activeChildHref !== undefined
  const [open, setOpen] = useState(anyChildActive)

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
            : 'text-white/60 hover:text-white hover:bg-white/10'
        )}
      >
        <div className="flex items-center gap-2.5">
          {group.icon && <span className="flex-shrink-0 opacity-70">{group.icon}</span>}
          {group.label}
        </div>
        <svg
          className={cn('w-3.5 h-3.5 opacity-50 transition-transform flex-shrink-0', open ? 'rotate-180' : '')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {group.children.map(child => {
            const active = child.href === activeChildHref
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  active
                    ? 'bg-white text-brand-green shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                {child.icon && <span className="flex-shrink-0 opacity-60">{child.icon}</span>}
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── NavSidebar ────────────────────────────────────────────────────────────────
interface NavSidebarProps {
  profile: Profile
  brands?: { id: string; brand_name: string | null; status: string }[]
  activeBrandId?: string
}

export function NavSidebar({ profile, brands, activeBrandId }: NavSidebarProps) {
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
      <div className="fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 md:hidden z-30 border-b border-white/10"
        style={{ background: 'linear-gradient(160deg, #3a4a3a 0%, #2d3d2d 100%)' }}>
        <Image src="/logo-white.png" alt="Franchise Foundry" width={120} height={32} className="object-contain" priority />
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
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-64 flex flex-col z-50 transition-transform duration-300',
          'md:static md:w-60 md:min-h-screen md:translate-x-0 md:z-auto md:transition-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'linear-gradient(160deg, #3a4a3a 0%, #2d3d2d 100%)' }}
      >
        {/* ── Logo + bell row ─────────────────────────── */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <Link href={`/${profile.role}`} onClick={() => setMobileOpen(false)}>
            <Image src="/logo-white.png" alt="Franchise Foundry" width={140} height={38} className="object-contain" priority />
          </Link>
          <div className="flex items-center gap-0.5">
            <NotificationBell compact />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="md:hidden text-white/50 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Brand switcher ─────────────────────────── */}
        {brands && brands.length > 1 && (
          <div className="px-3 py-2 border-b border-white/10">
            <p className="px-3 text-white/30 text-[10px] font-bold uppercase tracking-widest mb-1">Brand</p>
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => {
                  document.cookie = `ff_active_brand_id=${brand.id}; path=/; max-age=2592000; SameSite=Lax`
                  router.refresh()
                  setMobileOpen(false)
                }}
                className={cn(
                  'w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors',
                  brand.id === activeBrandId
                    ? 'text-white bg-white/15 font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', brand.id === activeBrandId ? 'bg-emerald-400' : 'bg-transparent')} />
                <span className="truncate">{brand.brand_name ?? 'Unnamed brand'}</span>
              </button>
            ))}
            <button
              onClick={() => { router.push('/franchisor/onboarding?add_brand=1'); setMobileOpen(false) }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors mt-0.5"
            >
              <span className="text-base leading-none">+</span> Add another brand
            </button>
          </div>
        )}

        {/* ── Nav ─────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item, i) => {
            if (isDivider(item)) {
              return (
                <p key={i} className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/25">
                  {item.sectionLabel}
                </p>
              )
            }

            if (isGroup(item)) {
              return (
                <NavGroupItem
                  key={i}
                  group={item}
                  pathname={pathname}
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
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-white text-brand-green shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                {item.icon && (
                  <span className={cn('flex-shrink-0', active ? 'opacity-100' : 'opacity-70')}>
                    {item.icon}
                  </span>
                )}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* ── Admin preview switcher ──────────────────── */}
        {profile.role === 'admin' && (
          <div className="px-3 pb-3 border-t border-white/10 pt-3 flex-shrink-0">
            <p className="px-3 text-white/30 text-[10px] font-bold uppercase tracking-widest mb-1">Preview as</p>
            {[
              { href: '/franchisee', label: 'Franchisee view' },
              { href: '/franchisor', label: 'Franchisor view' },
              { href: '/introducer', label: 'Agent view' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <FranchiseeIcon className="w-3 h-3 opacity-60" />
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* ── User footer ─────────────────────────────── */}
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
              <p className="text-white/40 text-[10px] capitalize">{roleLabel(profile.role)}</p>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-white/50 hover:text-white/90 rounded-lg hover:bg-white/10 transition-colors"
          >
            <SignOutIcon className="w-3.5 h-3.5 opacity-60" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
