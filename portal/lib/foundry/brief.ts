/**
 * Briefing and chase emails to partners. Plain-text templates the admin
 * edits before sending, rendered to simple escaped HTML. Pure, so it's tested.
 */

export interface BriefInput {
  partnerName: string
  contactName: string | null
  memberName: string
  memberEmail: string | null
  memberPhone: string | null
  context: { brand?: string | null; sector?: string | null; area?: string | null; budget?: string | null; stage?: string | null; role?: string | null }
  need: string | null
  callTime: string | null
  deal: string | null
  senderName: string
}

const STAGE_WORDS: Record<string, string> = {
  exploring: 'still choosing a franchise',
  opening: 'signed and opening',
  expanding: 'opening another site',
}

export function briefSubject(i: Pick<BriefInput, 'memberName' | 'partnerName'>): string {
  return `Introduction: ${i.memberName} (via Franchise Foundry)`
}

export function briefTemplate(i: BriefInput): string {
  const hello = i.contactName ? `Hi ${i.contactName.split(' ')[0]},` : `Hi ${i.partnerName} team,`
  const who = i.context.role === 'franchisor'
    ? `${i.memberName}${i.context.brand ? `, who runs ${i.context.brand}` : ''}`
    : `${i.memberName}${i.context.brand ? `, franchisee with ${i.context.brand}` : ''}`
  const facts = [
    i.context.sector ? `${i.context.sector} franchise` : null,
    i.context.area,
    i.context.budget ? `budget around ${i.context.budget}` : null,
    i.context.stage ? STAGE_WORDS[i.context.stage] ?? null : null,
  ].filter(Boolean)
  const contact = [i.memberEmail, i.memberPhone].filter(Boolean).join(' · ')
  return [
    hello,
    '',
    `Introducing ${sentence(who)}${facts.length ? ` ${sentence(capitalise(facts.join(', ')))}` : ''}`,
    '',
    `What they need: ${i.need?.trim() || 'an initial conversation about how you could help.'}`,
    i.callTime ? `Best time for a call: ${i.callTime}.` : null,
    '',
    `Could you contact them within 24 hours?${i.deal ? ` The Foundry member deal applies: ${sentence(i.deal)}` : ''}`,
    '',
    `${i.memberName}${contact ? `\n${contact}` : ''}`,
    '',
    'Thanks,',
    `${i.senderName}, Franchise Foundry`,
  ].filter(l => l !== null).join('\n')
}

export function chaseTemplate(i: { partnerName: string; contactName: string | null; memberName: string; senderName: string }): string {
  const hello = i.contactName ? `Hi ${i.contactName.split(' ')[0]},` : `Hi ${i.partnerName} team,`
  return [
    hello,
    '',
    `Just checking in on the introduction to ${i.memberName} we sent yesterday. Have you managed to get hold of them?`,
    '',
    'If anything’s holding it up, let me know and I’ll help.',
    '',
    'Thanks,',
    `${i.senderName}, Franchise Foundry`,
  ].join('\n')
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Plain text → minimal branded HTML. Every character of the text is escaped. */
export function textEmailHtml(text: string): string {
  const paras = text.trim().split(/\n{2,}/).map(p =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1b211a;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f4f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#3a4a3a;padding:20px 32px;"><span style="font-size:16px;font-weight:700;color:#ffffff;">Franchise Foundry</span></td></tr>
<tr><td style="padding:28px 32px;">${paras.join('')}</td></tr>
</table></td></tr></table></body></html>`
}

/** End with a full stop unless it already ends in punctuation ("Brew & Co."). */
function sentence(s: string) {
  return /[.!?]$/.test(s) ? s : `${s}.`
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
