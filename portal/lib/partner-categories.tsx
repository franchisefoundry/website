/**
 * Single source of truth for the marketplace's job-based partner
 * categories — label, icon and pill colour. Imported by the member
 * marketplace, the partner detail slide-over and the admin form so
 * the taxonomy never drifts between them.
 */
import type { ReactElement } from 'react'
import type { PartnerCategory } from '@/lib/supabase/types'
import {
  FundingIcon, PropertyIcon, LegalIcon, AccountingIcon, TechnologyIcon,
  InsuranceIcon, MarketingIcon, RecruitmentIcon, PartnerIcon,
} from '@/components/icons'

export interface CategoryMeta {
  value: PartnerCategory
  label: string      // full label, e.g. "Accounting & tax"
  short: string      // pill label, e.g. "Accounting"
  Icon: (props: { className?: string }) => ReactElement
  pill: string       // tailwind classes for the coloured pill
}

export const PARTNER_CATEGORIES: CategoryMeta[] = [
  { value: 'funding',     label: 'Funding',            short: 'Funding',     Icon: FundingIcon,     pill: 'bg-blue-50 text-blue-700' },
  { value: 'property',    label: 'Property & fit-out', short: 'Property',    Icon: PropertyIcon,    pill: 'bg-amber-50 text-amber-700' },
  { value: 'legal',       label: 'Legal',              short: 'Legal',       Icon: LegalIcon,       pill: 'bg-slate-100 text-slate-700' },
  { value: 'accounting',  label: 'Accounting & tax',   short: 'Accounting',  Icon: AccountingIcon,  pill: 'bg-emerald-50 text-emerald-700' },
  { value: 'technology',  label: 'Technology & EPOS',  short: 'Technology',  Icon: TechnologyIcon,  pill: 'bg-violet-50 text-violet-700' },
  { value: 'insurance',   label: 'Insurance',          short: 'Insurance',   Icon: InsuranceIcon,   pill: 'bg-sky-50 text-sky-700' },
  { value: 'marketing',   label: 'Marketing',          short: 'Marketing',   Icon: MarketingIcon,   pill: 'bg-rose-50 text-rose-700' },
  { value: 'recruitment', label: 'Recruitment & HR',   short: 'Recruitment', Icon: RecruitmentIcon, pill: 'bg-indigo-50 text-indigo-700' },
  { value: 'other',       label: 'Other',              short: 'Other',       Icon: PartnerIcon,     pill: 'bg-slate-100 text-slate-500' },
]

const FALLBACK: CategoryMeta = PARTNER_CATEGORIES[PARTNER_CATEGORIES.length - 1]

export function categoryMeta(value: string | null | undefined): CategoryMeta {
  return PARTNER_CATEGORIES.find(c => c.value === value) ?? FALLBACK
}
