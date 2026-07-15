import { sendEmail } from './resend'

/**
 * Emails an agent their unique referral link so they can start sharing it.
 * Sent by an admin from the Agents page.
 */
export async function sendReferralLinkEmail(to: string, name: string | null, link: string) {
  const greeting = name ? `Hi ${name.split(' ')[0]},` : 'Hi,'

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
          <h1 style="margin:0 0 12px;font-size:19px;font-weight:700;color:#111827;line-height:1.4;">Your referral link is ready</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Share this link with anyone considering a franchise. When they complete our matching quiz through it,
            the lead is automatically attributed to you and appears in your agent portal.
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:0 0 24px;font-size:13px;color:#334155;word-break:break-all;">
            ${link}
          </div>
          <table cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
            <tr><td style="background:#3a4a3a;border-radius:8px;text-align:center;">
              <a href="${link}" style="display:inline-block;padding:13px 30px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                Open my link →
              </a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
            You can always find this link on your account page in the portal.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await sendEmail({ to, subject: 'Your Franchise Foundry referral link', html })
}
