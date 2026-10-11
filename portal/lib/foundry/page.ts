/**
 * Shared server-side setup for Foundry pages inside the portal.
 * Cached per request so layout + page don't repeat the queries.
 */
import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { canSeeFoundry, currentViewer, foundryMode } from './access'
import { planContextFor, loadPartners } from './data'

export type FoundryRole = 'franchisee' | 'franchisor' | 'admin'

export const foundryContext = cache(async (role: FoundryRole) => {
  if (!(await canSeeFoundry())) notFound()
  const viewer = await currentViewer()
  if (!viewer) redirect('/login')
  const admin = createAdminClient()
  const [plan, { data: profile }, partners] = await Promise.all([
    planContextFor(admin, viewer),
    admin.from('profiles').select('full_name').eq('id', viewer.id).single(),
    loadPartners(admin, { includeDemo: foundryMode() === 'preview' }),
  ])
  // Admins previewing a member portal see it as that member type would;
  // in their own /admin/foundry they see every partner.
  if (viewer.role === 'admin') plan.audience = role === 'admin' ? 'any' : role
  return {
    viewer,
    plan,
    partners,
    firstName: profile?.full_name?.split(' ')[0] ?? null,
    base: `/${role}/foundry`,
    preview: foundryMode() === 'preview',
  }
})
