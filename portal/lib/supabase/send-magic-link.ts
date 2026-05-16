import { Resend } from 'resend'
import { createAdminClient } from './admin'

/**
 * Sends a portal access email to an existing Supabase user.
 *
 * Uses admin.generateLink() to obtain the verified magic link URL, then
 * sends it via Resend directly. This is more reliable than signInWithOtp()
 * which has PKCE complications and Supabase rate limits.
 *
 * Only call this for users who already exist in Supabase auth (i.e. after
 * inviteUserByEmail has failed with "already registered").
 */
export async function sendMagicLink(
  email: string,
  name: string | null,
  redirectTo: string
): Promise<string | null> {
  const admin = createAdminClient()

  // generateLink creates a one-time verified link but does NOT send the email.
  // We send it ourselves via Resend below.
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  if (linkError) return linkError.message
  const actionLink = (data as { properties?: { action_link?: string } })?.properties?.action_link
  if (!actionLink) return 'Could not generate login link.'

  const resend = new Resend(process.env.RESEND_API_KEY!)

  const { error: emailError } = await resend.emails.send({
    from: `Franchise Foundry <${process.env.RESEND_FROM_EMAIL ?? 'team@franchisefoundry.co.uk'}>`,
    to: email,
    subject: 'Access your Franchise Foundry portal',
    html: buildEmail(name, actionLink, email),
  })

  return emailError ? String(emailError) : null
}

function buildEmail(name: string | null, link: string, toEmail: string): string {
  const greeting = name ? `Hi ${name.split(' ')[0]},` : 'Hi,'
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#3a4a3a;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Franchise Foundry</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#374151;">${greeting}</p>
          <p style="margin:0 0 28px;font-size:16px;color:#374151;line-height:1.6;">
            Your Franchise Foundry portal access is ready. Click the button below to log in — the link is valid for 24 hours.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr><td style="background:#3a4a3a;border-radius:8px;text-align:center;">
              <a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                Access my portal →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="margin:0 0 32px;font-size:12px;color:#9ca3af;word-break:break-all;">${link}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            If you didn't expect this email, you can safely ignore it. This link was generated for ${toEmail}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
