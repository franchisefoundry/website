/** Vetting vocabulary shared by the admin UI (client) and the server. Pure data. */
import { REGION_LABEL, type Region } from './taxonomy.ts'

export const CHECKS = [
  { k: 'ch', t: 'Companies House', d: 'Active, accounts and confirmation statement filed on time' },
  { k: 'ins', t: 'Insurance certificate', d: 'PI and public liability in date' },
  { k: 'reg', t: 'Regulator check', d: 'FCA for funding, SRA for legal; otherwise the trade body' },
  { k: 'ref', t: '3 franchise client references', d: 'All three called' },
  { k: 'call', t: 'Founder call', d: '30 minutes: how they work, would we send our own franchisees' },
  { k: 'prof', t: 'Profile built and approved', d: 'Drafted with them, previewed before live' },
] as const
export type CheckKey = typeof CHECKS[number]['k']

export const TRUST_LEVELS = [['listed', 'Listed'], ['trusted', 'Trusted'], ['recommended', 'Recommended']] as const
export type TrustLevel = typeof TRUST_LEVELS[number][0]

export const APPLY_REGIONS: [string, string][] = [['uk', 'UK-wide'], ...(Object.entries(REGION_LABEL) as [Region, string][])]


/** Partner slug from a company name: "Hartley & Bloom Ltd" → "hartley-and-bloom-ltd". */
export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'partner'
}
