/**
 * Single source of truth for notification events.
 *
 * Every event delivers an in-app notification (always on). The `defaultEmail`
 * flag decides whether it ALSO emails the recipient by default — each user can
 * override this per-event via profiles.notification_prefs.
 *
 * The `key` doubles as the notifications.type value, so it must stay stable.
 */
export type NotificationRole = 'admin' | 'franchisor' | 'franchisee' | 'introducer'

export interface NotificationEvent {
  key: string
  role: NotificationRole
  label: string
  description: string
  defaultEmail: boolean
}

export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  // ── Admin ──────────────────────────────────────────────────────────────────
  { key: 'new_lead',                  role: 'admin', label: 'New lead — personal copy',      description: 'Email you personally when a lead submits (the team inbox is always alerted).', defaultEmail: false },
  { key: 'franchisor_quiz_submitted', role: 'admin', label: 'Franchisor completed questionnaire', description: 'A brand finishes their onboarding questionnaire.', defaultEmail: true },
  { key: 'agreement_signed',          role: 'admin', label: 'Agreement signed',              description: 'A franchisor signs their agreement.',               defaultEmail: true },
  { key: 'agreement_comment',         role: 'admin', label: 'Agreement comment added',       description: 'A franchisor leaves a comment on their agreement.', defaultEmail: true },
  { key: 'intro_request',             role: 'admin', label: 'Intro request raised',          description: 'A franchisee requests a marketplace introduction.', defaultEmail: true },
  { key: 'franchisor_first_login',    role: 'admin', label: 'Franchisor first login',        description: 'A franchisor logs into the portal for the first time.', defaultEmail: false },
  { key: 'franchisor_answers_changed', role: 'admin', label: 'Approved brand edited answers', description: 'A live franchisor changes their questionnaire after approval.', defaultEmail: false },
  { key: 'franchisee_first_login',    role: 'admin', label: 'Franchisee first login',        description: 'A franchisee logs into the portal for the first time.', defaultEmail: false },

  // ── Franchisor ─────────────────────────────────────────────────────────────
  { key: 'candidate_matched',   role: 'franchisor', label: 'New candidate matched',     description: 'A new candidate is assigned to your brand.',        defaultEmail: true },
  { key: 'candidate_interested', role: 'franchisor', label: 'Candidate expressed interest', description: 'A candidate accepts a match with your brand.',    defaultEmail: true },
  { key: 'agreement_ready',     role: 'franchisor', label: 'Agreement ready to sign',   description: 'Your Franchise Foundry agreement is ready.',        defaultEmail: true },
  { key: 'agreement_reply',     role: 'franchisor', label: 'Reply on your agreement',   description: 'The FF team replies to a comment on your agreement.', defaultEmail: true },

  // ── Franchisee ─────────────────────────────────────────────────────────────
  { key: 'match_revealed',      role: 'franchisee', label: 'Your match revealed',       description: 'A franchise brand is matched to you.',              defaultEmail: true },
  { key: 'stage_updated',       role: 'franchisee', label: 'Pipeline progress',         description: 'Your application moves to a new stage.',            defaultEmail: true },
  { key: 'meeting_booked',      role: 'franchisee', label: 'Meeting confirmed',         description: 'A meeting with a brand is booked or confirmed.',    defaultEmail: true },
  { key: 'marketplace_unlocked', role: 'franchisee', label: 'Marketplace unlocked',     description: 'You gain access to the partner marketplace.',       defaultEmail: true },

  // ── Introducer ─────────────────────────────────────────────────────────────
  { key: 'referral_lead',  role: 'introducer', label: 'New referral lead',     description: 'Someone joins the matching platform via your referral link.', defaultEmail: true },
  { key: 'lead_accepted',  role: 'introducer', label: 'Lead accepted invite',  description: 'A lead you referred registers on the portal.',      defaultEmail: true },
  { key: 'lead_matched',   role: 'introducer', label: 'Lead matched',          description: 'A lead you referred is matched with a brand.',       defaultEmail: true },
  { key: 'lead_signed',    role: 'introducer', label: 'Lead signed (commission due)', description: 'A lead you referred signs — commission is due.', defaultEmail: true },
  { key: 'commission_paid', role: 'introducer', label: 'Commission paid',      description: 'A commission payment has been marked as paid.',      defaultEmail: true },
]

const BY_KEY = new Map(NOTIFICATION_EVENTS.map(e => [e.key, e]))

/** Returns the events relevant to a given role, in display order. */
export function eventsForRole(role: string): NotificationEvent[] {
  return NOTIFICATION_EVENTS.filter(e => e.role === role)
}

/**
 * Decides whether to send an email for an event given a user's saved prefs.
 * Unknown events default to false (in-app only); known events fall back to
 * their registry default when the user hasn't set an explicit preference.
 */
export function shouldEmail(prefs: Record<string, boolean> | null | undefined, key: string): boolean {
  const event = BY_KEY.get(key)
  if (!event) return false
  if (prefs && key in prefs) return prefs[key]
  return event.defaultEmail
}
