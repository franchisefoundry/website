/**
 * How an intro's stage reads to the person who asked for it: which of the
 * four steps is lit, the status line, and what happens next. Pure, so the
 * same words show in My intros, emails and the admin preview.
 */

export type IntroStage =
  | 'awaiting_verification' | 'to_brief' | 'briefed' | 'in_contact'
  | 'outcome' | 'closed' | 'withdrawn' | 'expired'

export const INTRO_STEPS = ['Requested', 'Briefed', 'Contacted you', 'How did it go?'] as const

export const OPEN_STAGES: IntroStage[] = ['awaiting_verification', 'to_brief', 'briefed', 'in_contact', 'outcome']

export interface IntroStatus {
  /** Steps completed, 0 to 4. */
  step: number
  status: string
  next: string
  tone: 'progress' | 'good' | 'done' | 'muted'
  /** Partner contact details can be shown to the member. */
  contactVisible: boolean
  open: boolean
}

function whenLabel(iso: string | null | undefined): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/London', weekday: 'long', hour: 'numeric', minute: '2-digit', hour12: true,
  }).replace(':00', '').replace(' am', 'am').replace(' pm', 'pm')
}

export function introStatus(stage: IntroStage, opts: { outcome?: string | null; slaDueAt?: string | null; rated?: boolean } = {}): IntroStatus {
  switch (stage) {
    case 'awaiting_verification':
      return { step: 0, status: 'Confirm your email', next: 'Check your inbox for our link', tone: 'progress', contactVisible: false, open: true }
    case 'to_brief': {
      const by = whenLabel(opts.slaDueAt)
      return { step: 1, status: 'Requested, briefing them now', next: by ? `We’ll brief them by ${by}` : 'We’ll brief them shortly', tone: 'progress', contactVisible: false, open: true }
    }
    case 'briefed':
      return { step: 2, status: 'Briefed, awaiting contact', next: 'Expect contact within a working day', tone: 'progress', contactVisible: false, open: true }
    case 'in_contact':
      return { step: 3, status: 'They’ve contacted you', next: opts.rated ? 'Thanks for the update' : 'Tell us how it’s going', tone: 'good', contactVisible: true, open: true }
    case 'outcome':
      return { step: 4, status: 'How did it go?', next: opts.rated ? 'Thanks, we’ll close this off' : 'Rate the intro', tone: 'good', contactVisible: true, open: true }
    case 'closed': {
      const status = opts.outcome === 'hired' ? 'Done · you worked with them' : opts.outcome === 'not_hired' ? 'Done · not taken forward' : 'Done'
      return { step: 4, status, next: '', tone: 'done', contactVisible: true, open: false }
    }
    case 'withdrawn':
      return { step: 0, status: 'Withdrawn', next: 'You withdrew this intro', tone: 'muted', contactVisible: false, open: false }
    case 'expired':
      return { step: 0, status: 'Expired', next: 'Not confirmed in time', tone: 'muted', contactVisible: false, open: false }
  }
}

export const RATINGS = [
  ['going_well', 'Going well'],
  ['slow', 'Slow to reply'],
  ['not_fit', 'Not a fit'],
] as const

export type Rating = typeof RATINGS[number][0]
