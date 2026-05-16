import { Resend } from 'resend'
import { createAdminClient } from './admin'

/**
 * Sends a portal access email to an existing Supabase user.
 *
 * Generates a hashed token via admin.generateLink(), then constructs a direct
 * /auth/confirm?token_hash=...&type=magiclink URL. This bypasses Supabase's
 * own verify redirect (which returns a PKCE ?code= that requires a code verifier
 * stored in the browser — impossible for server-generated links). The /auth/confirm
 * route handles token_hash via verifyOtp() which needs no browser state.
 */
export async function sendMagicLink(
  email: string,
  name: string | null,
  _redirectTo: string | null
): Promise<string | null> {
  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${siteUrl}/auth/confirm` },
  })

  if (linkError) {
    console.error('[sendMagicLink] generateLink error:', linkError.message, linkError.status)
    return linkError.message
  }

  const props = (data as { properties?: { hashed_token?: string } })?.properties
  const hashedToken = props?.hashed_token
  if (!hashedToken) {
    console.error('[sendMagicLink] generateLink returned no hashed_token. data keys:', Object.keys(data ?? {}))
    return 'Could not generate login link.'
  }

  // Construct link that goes directly to our route handler — no PKCE, no browser state needed.
  const actionLink = `${siteUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink`

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const from = `Franchise Foundry <${process.env.RESEND_FROM_EMAIL ?? 'team@franchisefoundry.co.uk'}>`

  const { data: sendData, error: emailError } = await resend.emails.send({
    from,
    to: email,
    subject: 'Access your Franchise Foundry portal',
    html: buildEmail(name, actionLink, email),
  })

  if (emailError) {
    console.error('[sendMagicLink] Resend error:', emailError.name, emailError.message)
    return `${emailError.name}: ${emailError.message}`
  }

  console.log('[sendMagicLink] Email sent successfully. id:', sendData?.id)
  return null
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
