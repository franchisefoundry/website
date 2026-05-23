import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Franchise Foundry <noreply@franchisefoundry.co.uk>'
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? 'hello@franchisefoundry.co.uk'
const PORTAL_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portal.franchisefoundry.co.uk'

const OPERATOR_LABELS: Record<string, string> = {
  'owner-operator': 'Owner-operator',
  'hire-manager': 'Hire a manager',
  'either': 'Open to either',
}

// ── 1. Team notification — sent when a new lead submits the unlock form ───────

export async function sendLeadNotificationToTeam({
  leadId,
  fullName,
  email,
  phone,
  investmentMin,
  investmentMax,
  operatorModel,
  timelineMonths,
  matchCount,
}: {
  leadId: string
  fullName: string
  email: string
  phone?: string | null
  investmentMin?: number | null
  investmentMax?: number | null
  operatorModel?: string | null
  timelineMonths?: number | null
  matchCount: number
}) {
  const budget =
    investmentMin && investmentMax
      ? `£${(investmentMin / 1000).toFixed(0)}k – £${(investmentMax / 1000).toFixed(0)}k`
      : 'Not specified'

  try {
    await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `New match enquiry — ${fullName}`,
      html: `
        <div style="font-family:'Sora',sans-serif;max-width:580px;margin:0 auto;color:#333;">
          <div style="background:#3a4a3a;padding:24px 28px;border-radius:10px 10px 0 0;">
            <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:.08em;">Franchise Foundry</p>
            <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">New Match Enquiry</h1>
          </div>
          <div style="background:white;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:7px 0;color:#6b7280;width:150px;font-size:14px;">Name</td><td style="padding:7px 0;font-weight:600;font-size:14px;">${fullName}</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:7px 0;font-size:14px;">${email}</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:14px;">Phone</td><td style="padding:7px 0;font-size:14px;">${phone ?? '—'}</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:14px;">Budget</td><td style="padding:7px 0;font-size:14px;">${budget}</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:14px;">Operator model</td><td style="padding:7px 0;font-size:14px;">${operatorModel ? (OPERATOR_LABELS[operatorModel] ?? operatorModel) : '—'}</td></tr>
              <tr><td style="padding:7px 0;color:#6b7280;font-size:14px;">Timeline</td><td style="padding:7px 0;font-size:14px;">${timelineMonths ? `${timelineMonths} months` : '—'}</td></tr>
              <tr style="border-top:1px solid #f3f4f6;">
                <td style="padding:10px 0;color:#6b7280;font-size:14px;">Matches found</td>
                <td style="padding:10px 0;font-weight:700;font-size:16px;color:#3a4a3a;">${matchCount} franchise${matchCount === 1 ? '' : 's'}</td>
              </tr>
            </table>
            <div style="margin-top:24px;">
              <a href="${PORTAL_URL}/admin/leads/${leadId}"
                 style="background:#3a4a3a;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
                View in Portal →
              </a>
            </div>
          </div>
        </div>
      `,
    })
  } catch (err) {
    // Don't block lead creation if email fails
    console.error('Failed to send team notification email:', err)
  }
}

// ── 2. Franchisee confirmation — sent immediately when they submit ─────────────

export async function sendLeadConfirmationToFranchisee({
  fullName,
  email,
}: {
  fullName: string
  email: string
}) {
  const firstName = fullName.trim().split(' ')[0]

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      replyTo: ADMIN_EMAIL,
      subject: 'We're reviewing your matches — Franchise Foundry',
      html: `
        <div style="font-family:'Sora',sans-serif;max-width:580px;margin:0 auto;color:#333;">
          <div style="background:#3a4a3a;padding:24px 28px;border-radius:10px 10px 0 0;">
            <p style="color:white;margin:0;font-size:18px;font-weight:700;">Franchise Foundry</p>
          </div>
          <div style="background:white;padding:32px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
            <h2 style="color:#3a4a3a;margin:0 0 16px;font-size:20px;">Hi ${firstName},</h2>
            <p style="color:#374151;line-height:1.7;margin:0 0 16px;">
              Thank you for completing the Franchise Foundry matching quiz. We've received your details and our team is now reviewing your matches.
            </p>
            <p style="color:#374151;line-height:1.7;margin:0 0 8px;">We'll be in touch within <strong>1 working day</strong> to:</p>
            <ul style="color:#374151;line-height:2;margin:0 0 20px;padding-left:20px;">
              <li>Walk you through your top franchise matches</li>
              <li>Reveal the brand names</li>
              <li>Answer any questions you have</li>
            </ul>
            <p style="color:#374151;line-height:1.7;margin:0 0 32px;">
              In the meantime, feel free to reply to this email if you have any questions.
            </p>
            <p style="color:#374151;margin:0;">Best regards,<br/><strong>The Franchise Foundry Team</strong></p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Franchise Foundry &middot;
              <a href="https://franchisefoundry.co.uk" style="color:#c8924a;text-decoration:none;">franchisefoundry.co.uk</a>
            </p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Failed to send franchisee confirmation email:', err)
  }
}

// ── 3. Franchisor match notification — triggered manually by admin ────────────

export async function sendFranchisorMatchNotification({
  franchisorEmail,
  franchisorName,
  brandName,
  matches,
}: {
  franchisorEmail: string
  franchisorName: string
  brandName: string
  matches: Array<{
    score: number
    budget: string
    timeline: string
    operatorModel: string
  }>
}) {
  const firstName = franchisorName.trim().split(' ')[0]
  const count = matches.length

  const matchRows = matches
    .map(
      m => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 4px;font-weight:600;color:#3a4a3a;font-size:14px;">${m.score}%</td>
        <td style="padding:10px 4px;color:#374151;font-size:14px;">${m.budget}</td>
        <td style="padding:10px 4px;color:#374151;font-size:14px;">${m.timeline}</td>
        <td style="padding:10px 4px;color:#374151;font-size:14px;">${m.operatorModel}</td>
      </tr>
    `
    )
    .join('')

  try {
    await resend.emails.send({
      from: FROM,
      to: franchisorEmail,
      replyTo: ADMIN_EMAIL,
      subject: `You have ${count} new matched candidate${count === 1 ? '' : 's'} — Franchise Foundry`,
      html: `
        <div style="font-family:'Sora',sans-serif;max-width:580px;margin:0 auto;color:#333;">
          <div style="background:#3a4a3a;padding:24px 28px;border-radius:10px 10px 0 0;">
            <p style="color:white;margin:0;font-size:18px;font-weight:700;">Franchise Foundry</p>
          </div>
          <div style="background:white;padding:32px 28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
            <h2 style="color:#3a4a3a;margin:0 0 16px;font-size:20px;">Hi ${firstName},</h2>
            <p style="color:#374151;line-height:1.7;margin:0 0 20px;">
              Great news — we have <strong>${count} new matched candidate${count === 1 ? '' : 's'}</strong> for <strong>${brandName}</strong> through our matching platform.
            </p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
              <thead>
                <tr style="border-bottom:2px solid #e5e7eb;">
                  <th style="text-align:left;padding:8px 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.07em;">Score</th>
                  <th style="text-align:left;padding:8px 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.07em;">Budget</th>
                  <th style="text-align:left;padding:8px 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.07em;">Timeline</th>
                  <th style="text-align:left;padding:8px 4px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.07em;">Operator</th>
                </tr>
              </thead>
              <tbody>${matchRows}</tbody>
            </table>
            <p style="color:#374151;line-height:1.7;margin:0 0 32px;">
              Our team will be in touch shortly to discuss introductions and next steps. You can also view your matches in your Franchise Foundry portal.
            </p>
            <a href="${PORTAL_URL}/franchisor/matches"
               style="background:#3a4a3a;color:white;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
              View My Matches →
            </a>
            <p style="color:#374151;margin:32px 0 0;">Best regards,<br/><strong>The Franchise Foundry Team</strong></p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              Franchise Foundry &middot;
              <a href="https://franchisefoundry.co.uk" style="color:#c8924a;text-decoration:none;">franchisefoundry.co.uk</a>
            </p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Failed to send franchisor notification email:', err)
    throw err // re-throw so the API can return an error to the UI
  }
}
