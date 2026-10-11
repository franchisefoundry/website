/**
 * Emails to website visitors (no portal account): confirm your request,
 * your tracker link, and intro updates. Everything they typed is escaped.
 */
import { sendEmail } from '@/lib/email/resend'
import { escapeHtml } from './brief.ts'

function layout(inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f4f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1b211a;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#3a4a3a;padding:20px 32px;"><span style="font-size:16px;font-weight:700;color:#ffffff;">The Foundry</span><span style="font-size:12px;color:#c9d3ca;"> by Franchise Foundry</span></td></tr>
<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6;">${inner}</td></tr>
<tr><td style="padding:0 32px 24px;font-size:12px;color:#6c746a;">You’re getting this because you requested intros on The Foundry. No account needed: the link is your access, so keep it to yourself.</td></tr>
</table></td></tr></table></body></html>`
}

function button(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:8px 0 18px;padding:13px 22px;border-radius:10px;background:#c8924a;color:#161a16;font-weight:700;text-decoration:none;">${escapeHtml(label)}</a>`
}

export async function sendVerifyEmail(to: string, name: string | null, partners: string[], link: string) {
  const hi = name ? `Hi ${escapeHtml(name.split(' ')[0])},` : 'Hi,'
  const list = partners.map(p => `<li>${escapeHtml(p)}</li>`).join('')
  await sendEmail({
    to,
    subject: 'Confirm your intro request',
    html: layout(`<p style="margin:0 0 12px;">${hi}</p>
<p style="margin:0 0 12px;">Confirm your email and we’ll brief ${partners.length === 1 ? 'this partner' : `these ${partners.length} partners`} on what you need:</p>
<ul style="margin:0 0 12px;padding-left:20px;">${list}</ul>
${button(link, 'Confirm and send my requests')}
<p style="margin:0;font-size:13px;color:#6c746a;">Didn’t ask for this? Ignore this email and nothing will be shared.</p>`),
  })
}

export async function sendTrackerEmail(to: string, name: string | null, links: { label: string; url: string }[]) {
  const hi = name ? `Hi ${escapeHtml(name.split(' ')[0])},` : 'Hi,'
  await sendEmail({
    to,
    subject: 'Your Foundry intro tracker',
    html: layout(`<p style="margin:0 0 12px;">${hi}</p>
<p style="margin:0 0 12px;">Here’s where to see how your intros are going:</p>
${links.map(l => `<p style="margin:0 0 6px;"><a href="${escapeHtml(l.url)}" style="color:#3a4a3a;font-weight:700;">${escapeHtml(l.label)}</a></p>`).join('')}`),
  })
}

export async function sendVisitorUpdate(to: string, name: string | null, title: string, body: string, trackUrl: string) {
  const hi = name ? `Hi ${escapeHtml(name.split(' ')[0])},` : 'Hi,'
  await sendEmail({
    to,
    subject: title,
    html: layout(`<p style="margin:0 0 12px;">${hi}</p>
<h1 style="margin:0 0 8px;font-size:19px;">${escapeHtml(title)}</h1>
<p style="margin:0 0 12px;">${escapeHtml(body)}</p>
${button(trackUrl, 'View your intros')}`),
  })
}
