import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Franchise Foundry Portal',
  description: 'How Franchise Foundry collects, uses and protects your personal data.',
}

const LAST_UPDATED = '14 June 2026'
const CONTACT_EMAIL = 'connect@franchisefoundry.co.uk'
const COMPANY_NAME = 'Franchise Foundry Ltd'

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px', color: '#1e293b', fontFamily: "var(--font-sora), system-ui, sans-serif", lineHeight: 1.75 }}>
      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8 }}>Last updated: {LAST_UPDATED}</p>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#475569', marginBottom: 40 }}>
        This policy explains how {COMPANY_NAME} (&quot;Franchise Foundry&quot;, &quot;we&quot;, &quot;us&quot;) collects, uses and
        protects personal data when you use the Franchise Foundry Partner Portal.
      </p>

      <Section title="1. Who we are">
        <p>
          {COMPANY_NAME} is the data controller for personal data processed through this portal.
          We are registered in England and Wales. For any data protection queries, please contact
          us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#3a4a3a', fontWeight: 500 }}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="2. What data we collect">
        <p>We collect the following categories of personal data:</p>
        <ul>
          <li><strong>Identity data:</strong> full name, email address, phone number</li>
          <li><strong>Profile data:</strong> financial background, investment capacity, location, employment history, lifestyle preferences (provided by franchisee applicants during registration)</li>
          <li><strong>Business data:</strong> brand details, investment ranges, franchise model information (provided by franchisors)</li>
          <li><strong>Usage data:</strong> log-in times, pages visited, actions taken within the portal (collected automatically)</li>
          <li><strong>Communications data:</strong> notes and messages exchanged through the portal</li>
          <li><strong>Technical data:</strong> IP address, browser type, device identifiers (collected automatically for security purposes)</li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <p>We process your personal data for the following purposes and legal bases:</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginTop: 12 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Purpose</th>
              <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Legal basis</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Matching franchisee applicants with suitable franchise brands', 'Legitimate interests / Contract performance'],
              ['Providing portal access and account management', 'Contract performance'],
              ['Sending notifications about your matches and portal activity', 'Legitimate interests'],
              ['Processing and storing signed agreements', 'Contract performance / Legal obligation'],
              ['Fraud prevention and security monitoring', 'Legitimate interests / Legal obligation'],
              ['Improving our matching algorithm and portal features', 'Legitimate interests'],
              ['Complying with legal and regulatory obligations', 'Legal obligation'],
            ].map(([purpose, basis]) => (
              <tr key={purpose} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', color: '#334155' }}>{purpose}</td>
                <td style={{ padding: '10px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="4. Who we share your data with">
        <p>We share your personal data only in the following circumstances:</p>
        <ul>
          <li><strong>Matched franchise brands:</strong> when you are matched with a franchisor, relevant profile information (name, location, investment capacity, background summary) is shared with that brand.</li>
          <li><strong>Introducers:</strong> if you were referred by an introducer partner, they may receive limited status updates about your application.</li>
          <li><strong>Technology providers:</strong> we use Supabase (database and authentication), Resend (transactional email), and Netlify (hosting). All are GDPR-compliant processors under appropriate data processing agreements.</li>
          <li><strong>Legal requirements:</strong> we may disclose data if required to do so by law or by a court or regulatory authority.</li>
        </ul>
        <p>We do <strong>not</strong> sell your personal data to third parties.</p>
      </Section>

      <Section title="5. Cookies">
        <p>
          The portal uses only <strong>strictly necessary cookies</strong> to keep you securely signed in.
          These are authentication session cookies set by Supabase. They are essential for the portal
          to function and do not require your consent under UK GDPR.
        </p>
        <p>
          We do not use advertising cookies, analytics tracking cookies (e.g. Google Analytics),
          or any third-party tracking technologies on the portal.
        </p>
      </Section>

      <Section title="6. Data retention">
        <p>We retain your personal data for the following periods:</p>
        <ul>
          <li><strong>Active accounts:</strong> for as long as your account is active</li>
          <li><strong>Inactive accounts:</strong> data is reviewed after 24 months of inactivity and deleted if there is no ongoing business relationship</li>
          <li><strong>Signed agreements:</strong> retained for 7 years to comply with legal obligations</li>
          <li><strong>Security logs:</strong> retained for 12 months</li>
        </ul>
      </Section>

      <Section title="7. Your rights">
        <p>Under UK GDPR you have the following rights:</p>
        <ul>
          <li><strong>Access:</strong> request a copy of the personal data we hold about you</li>
          <li><strong>Rectification:</strong> ask us to correct inaccurate or incomplete data</li>
          <li><strong>Erasure:</strong> request deletion of your data (&quot;right to be forgotten&quot;)</li>
          <li><strong>Restriction:</strong> ask us to pause processing of your data</li>
          <li><strong>Portability:</strong> request your data in a machine-readable format</li>
          <li><strong>Objection:</strong> object to processing based on legitimate interests</li>
          <li><strong>Withdraw consent:</strong> where processing relies on consent, you may withdraw it at any time</li>
        </ul>
        <p>
          To exercise any of these rights, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#3a4a3a', fontWeight: 500 }}>{CONTACT_EMAIL}</a> with
          the subject line &quot;Data Subject Request&quot;. We will respond within 30 days.
        </p>
        <p>
          You also have the right to lodge a complaint with the{' '}
          <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: '#3a4a3a', fontWeight: 500 }}>
            Information Commissioner&apos;s Office (ICO)
          </a>.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We implement appropriate technical and organisational measures to protect your personal data,
          including encrypted connections (HTTPS), access controls, session timeout, and regular
          security reviews. All data is stored in the UK/EEA on Supabase infrastructure.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We may update this policy from time to time. We will notify you of material changes via
          email or a notice in the portal. The &quot;Last updated&quot; date at the top of this page
          reflects the most recent revision.
        </p>
      </Section>

      <Section title="10. Contact us">
        <p>
          For any questions about this policy or how we handle your data, please contact:<br />
          <strong>{COMPANY_NAME}</strong><br />
          Email: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#3a4a3a', fontWeight: 500 }}>{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
        {title}
      </h2>
      <div style={{ color: '#475569' }}>{children}</div>
    </section>
  )
}
