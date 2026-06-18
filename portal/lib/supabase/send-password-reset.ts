import { Resend } from 'resend'
import { createAdminClient } from './admin'

/**
 * Sends a password reset / set-password email via Resend.
 *
 * We generate a `recovery` link ourselves (token_hash, no PKCE) rather than using
 * supabase.auth.resetPasswordForEmail(), which relies on Supabase's built-in SMTP
 * (rate-limited, and its link format doesn't match our /auth/reset-password page).
 *
 * Works for both "I forgot my password" and "I was invited but never set one".
 * Returns null on success, or an error string. Callers should NOT surface whether
 * the email existed (avoid account enumeration) — log the error, return success.
 */
export async function sendPasswordReset(email: string, name: string | null): Promise<string | null> {
  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim().toLowerCase(),
    options: { redirectTo: `${siteUrl}/auth/reset-password` },
  })

  if (linkError) {
    console.error('[sendPasswordReset] generateLink error:', linkError.message)
    return linkError.message
  }

  const hashedToken = (data as { properties?: { hashed_token?: string } })?.properties?.hashed_token
  if (!hashedToken) {
    return 'Could not generate reset link.'
  }

  // Direct token_hash link — verified by /auth/reset-password via verifyOtp (no PKCE)
  const actionLink = `${siteUrl}/auth/reset-password?token_hash=${hashedToken}&type=recovery`

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const from = `Franchise Foundry <${process.env.RESEND_FROM_EMAIL ?? 'team@franchisefoundry.co.uk'}>`

  const { error: emailError } = await resend.emails.send({
    from,
    to: email,
    subject: 'Reset your Franchise Foundry password',
    html: buildEmail(name, actionLink, email),
  })

  if (emailError) {
    console.error('[sendPasswordReset] Resend error:', emailError.name, emailError.message)
    return `${emailError.name}: ${emailError.message}`
  }

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
            We received a request to set or reset the password for your Franchise Foundry account. Click the button below to choose a new password — this link is valid for 24 hours.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr><td style="background:#3a4a3a;border-radius:8px;text-align:center;">
              <a href="${link}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                Set my password →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="margin:0 0 32px;font-size:12px;color:#9ca3af;word-break:break-all;">${link}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            If you didn't request this, you can safely ignore this email. This link was generated for ${toEmail}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
