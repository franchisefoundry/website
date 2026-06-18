import { sendEmail } from './resend'

const PORTAL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'

/**
 * Generic branded notification email — used for every activity notification so
 * that adding an event never requires a bespoke template. Mirrors the in-app
 * notification's title/body/link.
 */
export async function sendNotificationEmail({
  to,
  name,
  title,
  body,
  link,
}: {
  to: string
  name?: string | null
  title: string
  body?: string | null
  link?: string | null
}) {
  const greeting = name ? `Hi ${name.split(' ')[0]},` : 'Hi,'
  const ctaUrl = link ? (link.startsWith('http') ? link : `${PORTAL_URL}${link}`) : PORTAL_URL

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#3a4a3a;padding:28px 40px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Franchise Foundry</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#6b7280;">${greeting}</p>
          <h1 style="margin:0 0 12px;font-size:19px;font-weight:700;color:#111827;line-height:1.4;">${title}</h1>
          ${body ? `<p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">${body}</p>` : '<div style="height:12px;"></div>'}
          <table cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
            <tr><td style="background:#3a4a3a;border-radius:8px;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;padding:13px 30px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                View in portal →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            You're receiving this because of your notification settings. Manage which updates email you in your portal profile.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await sendEmail({ to, subject: title, html })
}
