export type Role = 'franchisee' | 'franchisor' | 'admin'
export type OperatorModel = 'owner-operator' | 'hire-manager' | 'either'
export type Experience = 'none' | 'management' | 'food-beverage'
export type FranchiseeStatus = 'pending_invite' | 'active' | 'signed' | 'inactive'
export type FranchisorStatus = 'draft' | 'pending_review' | 'active' | 'inactive'
export type MatchStatus = 'suggested' | 'shown' | 'interested' | 'intro_made' | 'declined'
export type PartnerSector = 'finance' | 'property' | 'tech' | 'legal' | 'other'
export type PartnerAudience = 'franchisee' | 'franchisor' | 'both'
export type IntroStatus = 'pending' | 'sent' | 'completed'

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface FranchiseeProfile {
  id: string
  user_id: string
  investment_min: number | null
  investment_max: number | null
  preferred_locations: string[]
  operator_model: OperatorModel | null
  experience: Experience | null
  full_time_available: boolean | null
  multi_site_interest: boolean
  timeline_months: number | null
  sectors: string[]
  goals: string | null
  status: FranchiseeStatus
  tier_2_unlocked: boolean
  invited_at: string | null
  activated_at: string | null
  signed_at: string | null
  assigned_admin: string | null
  created_at: string
  updated_at: string
  // joined
  profile?: Profile
}

export interface FranchisorProfile {
  id: string
  user_id: string | null
  brand_name: string | null
  slug: string | null
  category: string | null
  teaser: string | null
  investment_min: number | null
  investment_max: number | null
  investment_display: string | null
  locations_available: string[]
  locations_display: string | null
  sectors: string[]
  timeline_months: number | null
  highlights: string[]
  operator_model: OperatorModel | null
  format: string[]
  experience_required: Experience | null
  multi_site_ready: boolean
  full_time_required: boolean
  status: FranchisorStatus
  admin_notes: string | null
  contact_email: string | null
  contact_name: string | null
  created_at: string
  updated_at: string
  // joined
  profile?: Profile
}

export interface Match {
  id: string
  franchisee_id: string
  franchisor_id: string
  score: number
  status: MatchStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
  // joined
  franchisee?: FranchiseeProfile
  franchisor?: FranchisorProfile
}

export interface Partner {
  id: string
  name: string
  slug: string
  sector: PartnerSector
  audience: PartnerAudience
  tagline: string | null
  description: string | null
  logo_url: string | null
  features: PartnerFeature[]
  is_active: boolean
  display_order: number
  created_at: string
}

export interface PartnerFeature {
  label: string
  value: string
}

export interface IntroRequest {
  id: string
  requester_id: string
  partner_id: string
  message: string | null
  status: IntroStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
  // joined
  requester?: Profile
  partner?: Partner
}

export interface Invite {
  id: string
  email: string
  role: 'franchisee' | 'franchisor'
  full_name: string | null
  invited_by: string | null
  created_at: string
}

// UK cities for location dropdowns
export const UK_CITIES = [
  { value: 'london', label: 'London' },
  { value: 'manchester', label: 'Manchester' },
  { value: 'birmingham', label: 'Birmingham' },
  { value: 'leeds', label: 'Leeds' },
  { value: 'liverpool', label: 'Liverpool' },
  { value: 'glasgow', label: 'Glasgow' },
  { value: 'edinburgh', label: 'Edinburgh' },
  { value: 'bristol', label: 'Bristol' },
  { value: 'sheffield', label: 'Sheffield' },
  { value: 'nottingham', label: 'Nottingham' },
  { value: 'cardiff', label: 'Cardiff' },
  { value: 'leicester', label: 'Leicester' },
  { value: 'coventry', label: 'Coventry' },
  { value: 'bradford', label: 'Bradford' },
  { value: 'belfast', label: 'Belfast' },
]

export type LeadStatus = 'new' | 'meeting_requested' | 'converted' | 'rejected'

export interface Lead {
  id: string
  full_name: string
  email: string
  phone: string | null
  investment_min: number | null
  investment_max: number | null
  preferred_locations: string[]
  operator_model: OperatorModel | null
  experience: Experience | null
  full_time_available: boolean
  multi_site_interest: boolean
  timeline_months: number | null
  sectors: string[]
  goals: string | null
  status: LeadStatus
  created_at: string
}

export interface LeadMatch {
  id: string
  lead_id: string
  franchisor_id: string
  score: number
  // joined
  franchisor?: FranchisorProfile
}

export const SECTORS = [
  { value: 'food-beverage', label: 'Food & Beverage' },
  { value: 'health-fitness', label: 'Health & Fitness' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Home & Business Services' },
  { value: 'education', label: 'Education & Childcare' },
  { value: 'other', label: 'Other' },
]
