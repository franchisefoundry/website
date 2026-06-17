import { Resend } from 'resend'

/**
 * Sends the initial portal invite email.
 * The link points to our own /auth/invite landing page (not a raw Supabase magic link),
 * which generates a fresh Supabase session only when the user clicks the button.
 * This decouples invite link lifetime (72 h, stored in our DB) from Supabase's
 * 24 h OTP cap.
 */
export async function sendInviteEmail(
  email: string,
  name: string | null,
  inviteToken: string,
): Promise<string | null> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!
  const inviteUrl = `${siteUrl}/auth/invite?token=${inviteToken}`

  const resend = new Resend(process.env.RESEND_API_KEY!)
  const from = `Franchise Foundry <${process.env.RESEND_FROM_EMAIL ?? 'team@franchisefoundry.co.uk'}>`

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "You've been invited to Franchise Foundry",
    html: buildEmail(name, inviteUrl, email),
  })

  if (error) {
    console.error('[sendInviteEmail] Resend error:', error.name, error.message)
    return `${error.name}: ${error.message}`
  }

  return null
}

function buildEmail(name: string | null, inviteUrl: string, toEmail: string): string {
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
            You've been invited to the Franchise Foundry partner portal. Click the button below to set up your access — this link is valid for <strong>72 hours</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr><td style="background:#3a4a3a;border-radius:8px;text-align:center;">
              <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                Access my portal →
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="margin:0 0 32px;font-size:12px;color:#9ca3af;word-break:break-all;">${inviteUrl}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            If you didn't expect this email, you can safely ignore it. This invite was sent to ${toEmail}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
