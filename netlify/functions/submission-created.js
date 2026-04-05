// ─────────────────────────────────────────────────────────────────────────────
// Franchise Foundry — Form Notification Emails
// Netlify function: submission-created
//
// Fires automatically on every Netlify form submission.
// Sends a clean, branded HTML notification email via Resend.
//
// Required env vars (set in Netlify dashboard → Site configuration → Env vars):
//   RESEND_API_KEY       — from resend.com (free tier is fine)
//   NOTIFICATION_EMAIL   — optional override; defaults to connect@franchisefoundry.co.uk
// ─────────────────────────────────────────────────────────────────────────────

// ── Value label maps ──────────────────────────────────────────────────────────

const BUDGET_LABELS = {
  'under-50k':   'Under £50k',
  '50k-100k':    '£50k - £100k',
  '100k-200k':   '£100k - £200k',
  '200k-500k':   '£200k - £500k',
  'over-500k':   'Over £500k'
};

const TIMELINE_LABELS = {
  'immediately':    'Ready now',
  '1-3-months':     '1 - 3 months',
  '3-6-months':     '3 - 6 months',
  '6-12-months':    '6 - 12 months',
  '12-plus-months': '12+ months'
};

const OPERATOR_LABELS = {
  'owner-operator': 'Owner-operator (hands on)',
  'hire-manager':   'Hire a manager (semi-passive)',
  'either':         'Either works'
};

const FORMAT_LABELS = {
  'dine-in':   'Dine-in restaurant',
  'takeaway':  'Takeaway / delivery',
  'kiosk':     'Kiosk / concession',
  'flexible':  'Flexible / no preference'
};

const MULTISITE_LABELS = {
  'single':      'One site to start',
  'multi-small': 'Multiple sites (2-5)',
  'multi-large': 'Multiple sites (6+)'
};

const EXPERIENCE_LABELS = {
  'first-business':  'First business',
  'management':      'Management background',
  'food-beverage':   'Food & beverage experience',
  'other-industry':  'Business experience (other industry)'
};

const FULLTIME_LABELS = {
  'full-time':  'Full-time',
  'part-time':  'Part-time'
};

const SECTOR_LABELS = {
  'qsr':               'QSR / fast food',
  'casual-dining':     'Casual dining',
  'coffee-drinks':     'Coffee & drinks',
  'bakery-pastry':     'Bakery & pastry',
  'other-hospitality': 'Other hospitality'
};

const TERRITORY_LABELS = {
  '1-2':      '1 - 2 territories',
  '3-5':      '3 - 5 territories',
  '6-10':     '6 - 10 territories',
  '10-plus':  '10+ territories'
};

const OPERATOR_TYPE_LABELS = {
  'owner-operator': 'Owner-operator',
  'hire-manager':   'Managed / semi-passive',
  'flexible':       'Flexible'
};

const BACKGROUND_LABELS = {
  'any':                'Any background welcome',
  'fb-preferred':       'Food & beverage preferred',
  'business-experience':'Business experience required',
  'multi-unit':         'Multi-unit / portfolio operators only'
};

const SITE_AMBITION_LABELS = {
  'single':    '1 site',
  '2-3-sites': '2 - 3 sites',
  '4-plus':    '4+ sites'
};

const TARGET_LABELS = {
  '1-2':     '1 - 2 franchisees',
  '3-5':     '3 - 5 franchisees',
  '6-10':    '6 - 10 franchisees',
  '10-plus': '10+ franchisees'
};

const CHALLENGE_LABELS = {
  'finding-candidates': 'Finding enough candidates',
  'quality-candidates': 'Quality of candidates',
  'conversion':         'Converting enquiries to awards',
  'candidate-prep':     'Candidates arriving underprepared'
};

const ENQUIRY_TYPE_LABELS = {
  'potential-franchisee': 'Potential franchisee',
  'franchise-brand':      'Franchise brand',
  'press-partnership':    'Press or partnership',
  'other':                'Other'
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function label(map, value) {
  if (!value) return '-';
  return map[value] || value;
}

function safe(value) {
  if (!value || value.toString().trim() === '') return '-';
  return value.toString().trim();
}

// ── Shared email chrome ───────────────────────────────────────────────────────

function emailWrap(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f7f8f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#3a4a3a;border-radius:12px 12px 0 0;padding:28px 36px;text-align:center;">
              <span style="color:#c8924a;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Franchise Foundry</span>
              <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:8px 0 0;">${title}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px;border-left:1px solid #e2e8e2;border-right:1px solid #e2e8e2;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#3a4a3a;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
              <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">Franchise Foundry &mdash; franchisefoundry.co.uk</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Row for a single field
function row(fieldLabel, value) {
  const display = value && value !== '-' ? value : '<span style="color:#9ca3af;">Not provided</span>';
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:40%;">
      <span style="font-size:12px;font-weight:600;color:#5f725f;text-transform:uppercase;letter-spacing:0.05em;">${fieldLabel}</span>
    </td>
    <td style="padding:10px 0 10px 16px;border-bottom:1px solid #f0f0f0;vertical-align:top;">
      <span style="font-size:14px;color:#161a16;">${display}</span>
    </td>
  </tr>`;
}

// Section heading inside the table
function sectionHeading(text) {
  return `
  <tr>
    <td colspan="2" style="padding:24px 0 8px;">
      <span style="font-size:11px;font-weight:700;color:#c8924a;text-transform:uppercase;letter-spacing:0.1em;">${text}</span>
    </td>
  </tr>`;
}

// Reply CTA button
function replyButton(email, name) {
  return `
  <div style="text-align:center;margin:32px 0 8px;">
    <a href="mailto:${email}" style="display:inline-block;background:#c8924a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
      Reply to ${name}
    </a>
  </div>`;
}

// ── Parse matches JSON into readable lines ────────────────────────────────────

function parseMatches(matchesRaw) {
  if (!matchesRaw || matchesRaw.trim() === '') return null;
  try {
    const matches = JSON.parse(matchesRaw);
    if (!Array.isArray(matches) || matches.length === 0) return null;
    return matches.map((m, i) => {
      const name = m.category || m.id || 'Brand';
      const score = m.score != null ? `${m.score}% match` : '';
      const invest = m.investmentDisplay ? `Investment: ${m.investmentDisplay}` : '';
      const locs = m.locationsDisplay ? `Locations: ${m.locationsDisplay}` : '';
      const teaser = m.teaser || '';
      const parts = [invest, locs, teaser].filter(Boolean).join(' &middot; ');
      return `<div style="margin:8px 0;padding:12px 14px;background:#f7f8f5;border-radius:6px;border-left:3px solid #c8924a;">
        <span style="font-size:13px;font-weight:600;color:#2a352a;">${i + 1}. ${name}</span>
        ${score ? `<span style="font-size:12px;color:#5f725f;margin-left:8px;">${score}</span>` : ''}
        ${parts ? `<div style="font-size:12px;color:#4a5568;margin-top:4px;">${parts}</div>` : ''}
      </div>`;
    }).join('');
  } catch (e) {
    return null;
  }
}

// ── Email builders ────────────────────────────────────────────────────────────

function buildFranchiseeEmail(data) {
  const name = safe(data.name);
  const matchesHtml = parseMatches(data.matches);

  const bodyHtml = `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${sectionHeading('Contact')}
      ${row('Name', name)}
      ${row('Email', safe(data.email))}
      ${row('Phone', safe(data.phone))}

      ${sectionHeading('Match criteria')}
      ${row('Budget', label(BUDGET_LABELS, data.budget))}
      ${row('Timeline', label(TIMELINE_LABELS, data.timeline))}
      ${row('How they want to operate', label(OPERATOR_LABELS, data.operator))}
      ${row('Format preference', label(FORMAT_LABELS, data.format))}
      ${row('Site ambition', label(MULTISITE_LABELS, data.multisite))}
      ${row('Background', label(EXPERIENCE_LABELS, data.experience))}
      ${row('Commitment', label(FULLTIME_LABELS, data.fulltime))}
      ${row('Location', safe(data.location))}

      ${data.message && data.message.trim() ? `
      ${sectionHeading('Their message')}
      <tr>
        <td colspan="2" style="padding:12px 0;">
          <div style="background:#f7f8f5;border-radius:8px;padding:16px;font-size:14px;color:#161a16;line-height:1.6;">${safe(data.message)}</div>
        </td>
      </tr>` : ''}

      ${matchesHtml ? `
      ${sectionHeading('Matched brands')}
      <tr>
        <td colspan="2" style="padding:8px 0 0;">
          ${matchesHtml}
        </td>
      </tr>` : ''}
    </table>

    ${replyButton(safe(data.email), name)}
  `;

  return {
    subject: `New franchisee enquiry from ${name}`,
    html: emailWrap('New Franchisee Enquiry', bodyHtml)
  };
}

function buildBrandEmail(data) {
  const name = safe(data.contact_name);

  const bodyHtml = `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${sectionHeading('Contact')}
      ${row('Name', name)}
      ${row('Role', safe(data.role))}
      ${row('Email', safe(data.email))}
      ${row('Phone', safe(data.phone))}
      ${row('Brand', safe(data.brand_name))}

      ${sectionHeading('Brand profile')}
      ${row('Sector', label(SECTOR_LABELS, data.sector))}
      ${row('Investment level', label(BUDGET_LABELS, data.investment))}
      ${row('Territories available', label(TERRITORY_LABELS, data.territory))}
      ${row('Operator type', label(OPERATOR_TYPE_LABELS, data.operator_type))}
      ${row('Franchisee background', label(BACKGROUND_LABELS, data.background))}
      ${row('Site ambition per franchisee', label(SITE_AMBITION_LABELS, data.site_ambition))}

      ${sectionHeading('Recruitment goals')}
      ${row('Target franchisees (12 months)', label(TARGET_LABELS, data.target))}
      ${row('Biggest challenge', label(CHALLENGE_LABELS, data.challenge))}
    </table>

    ${replyButton(safe(data.email), name)}
  `;

  return {
    subject: `New brand enquiry from ${safe(data.brand_name)} (${name})`,
    html: emailWrap('New Brand Enquiry', bodyHtml)
  };
}

function buildContactEmail(data) {
  const name = safe(data.name);

  const bodyHtml = `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${sectionHeading('Contact')}
      ${row('Name', name)}
      ${row('Email', safe(data.email))}
      ${row('Phone', safe(data.phone))}
      ${row('Enquiring as', label(ENQUIRY_TYPE_LABELS, data.enquiry_type))}

      ${data.message && data.message.trim() ? `
      ${sectionHeading('Message')}
      <tr>
        <td colspan="2" style="padding:12px 0;">
          <div style="background:#f7f8f5;border-radius:8px;padding:16px;font-size:14px;color:#161a16;line-height:1.6;">${safe(data.message)}</div>
        </td>
      </tr>` : ''}
    </table>

    ${replyButton(safe(data.email), name)}
  `;

  return {
    subject: `New message from ${name}`,
    html: emailWrap('New Contact Message', bodyHtml)
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body).payload;
    const formName = payload.form_name;
    const data = payload.data || {};

    // Build the appropriate email
    let emailContent;
    if (formName === 'franchise-enquiry') {
      emailContent = buildFranchiseeEmail(data);
    } else if (formName === 'brand-enquiry') {
      emailContent = buildBrandEmail(data);
    } else if (formName === 'contact') {
      emailContent = buildContactEmail(data);
    } else {
      // Unknown form — ignore gracefully
      console.log('submission-created: unknown form', formName);
      return { statusCode: 200, body: 'OK' };
    }

    // Check for API key
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('submission-created: RESEND_API_KEY not set — email not sent');
      return { statusCode: 200, body: 'OK (no API key)' };
    }

    const toAddress = process.env.NOTIFICATION_EMAIL || 'connect@franchisefoundry.co.uk';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Franchise Foundry <noreply@franchisefoundry.co.uk>',
        to: [toAddress],
        reply_to: data.email || data.contact_name || undefined,
        subject: emailContent.subject,
        html: emailContent.html
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('submission-created: Resend error', response.status, err);
    } else {
      console.log('submission-created: email sent for', formName);
    }

  } catch (err) {
    // Never let this function crash Netlify's form pipeline
    console.error('submission-created: unexpected error', err.message);
  }

  return { statusCode: 200, body: 'OK' };
};
