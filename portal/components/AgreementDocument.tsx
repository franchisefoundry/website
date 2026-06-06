'use client'

import Image from 'next/image'

/**
 * Renders a markdown agreement as a properly formatted legal document.
 * Used in both the admin preview and the franchisor-facing view.
 */
export function renderAgreementHtml(markdown: string): string {
  let html = markdown

  // Horizontal rules → styled divider
  html = html.replace(/^---+$/gm, '<hr class="agreement-rule" />')

  // H1 → centred document title
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="agreement-h1">$1</h1>'
  )

  // H2 → numbered section heading
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="agreement-h2">$1</h2>'
  )

  // H3 → sub-section
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="agreement-h3">$1</h3>'
  )

  // Bold-italic combo
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // List items — collect adjacent ones into <ul> after
  html = html.replace(/^[-•] (.+)$/gm, '<li class="agreement-li">$1</li>')
  html = html.replace(/(<li class="agreement-li">[\s\S]*?<\/li>)(\n(?!<li))/g, '$1</ul-placeholder>$2')
  // Wrap consecutive li groups
  html = html.replace(/((?:<li class="agreement-li">.*<\/li>\n?)+)/g, '<ul class="agreement-ul">$1</ul>')

  // Paragraphs — wrap lines not already in a block element
  const lines = html.split('\n')
  const result: string[] = []
  let inBlock = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inBlock) { result.push('</p>'); inBlock = false }
      continue
    }
    if (trimmed.startsWith('<h1') || trimmed.startsWith('<h2') || trimmed.startsWith('<h3') ||
        trimmed.startsWith('<ul') || trimmed.startsWith('<hr') || trimmed.startsWith('<li') ||
        trimmed.startsWith('</ul>') || trimmed.startsWith('</p>')) {
      if (inBlock) { result.push('</p>'); inBlock = false }
      result.push(trimmed)
    } else {
      if (!inBlock) { result.push('<p class="agreement-p">'); inBlock = true }
      else { result.push(' ') }
      result.push(trimmed)
    }
  }
  if (inBlock) result.push('</p>')

  return result.join('\n')
}

interface AgreementDocumentProps {
  title: string
  version: number
  content: string
  /** Optional: show a "SIGNED COPY" watermark overlay */
  signed?: boolean
  signedAt?: string | null
  signerName?: string | null
}

export default function AgreementDocument({
  title,
  version,
  content,
  signed,
  signedAt,
  signerName,
}: AgreementDocumentProps) {
  const html = renderAgreementHtml(content)

  return (
    <>
      {/* Document styles scoped to this component */}
      <style>{`
        .agreement-doc {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 14px;
          line-height: 1.7;
          color: #1a1a1a;
          background: white;
        }
        .agreement-h1 {
          font-family: 'Arial', sans-serif;
          font-size: 22px;
          font-weight: 700;
          text-align: center;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #111827;
          margin: 0 0 4px;
        }
        .agreement-h2 {
          font-family: 'Arial', sans-serif;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #111827;
          margin: 28px 0 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid #e5e7eb;
        }
        .agreement-h3 {
          font-family: 'Arial', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin: 20px 0 6px;
        }
        .agreement-p {
          margin: 0 0 12px;
          text-align: justify;
          hyphens: auto;
        }
        .agreement-ul {
          margin: 0 0 14px 0;
          padding: 0;
          list-style: none;
        }
        .agreement-li {
          padding: 3px 0 3px 20px;
          position: relative;
          text-align: justify;
        }
        .agreement-li::before {
          content: '–';
          position: absolute;
          left: 4px;
          color: #6b7280;
        }
        .agreement-rule {
          border: none;
          border-top: 1px solid #d1d5db;
          margin: 24px 0;
        }
        .agreement-doc strong {
          font-weight: 700;
          color: #111827;
        }
        .agreement-doc em {
          font-style: italic;
          color: #4b5563;
        }
      `}</style>

      <div className="bg-slate-100 px-4 py-8 rounded-xl">
        {/* A4-style document card */}
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-sm">
          {/* Header band */}
          <div className="bg-[#1a3a2a] px-10 py-6 flex items-center justify-between rounded-t-sm">
            <Image
              src="/logo-white.png"
              alt="Franchise Foundry"
              width={160}
              height={42}
              className="object-contain"
            />
            <div className="text-right">
              <p className="text-white/50 text-xs uppercase tracking-widest">Legal Agreement</p>
              <p className="text-white/70 text-xs mt-0.5">Version {version}</p>
            </div>
          </div>

          {/* Title block */}
          <div className="px-10 pt-8 pb-4 text-center border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Franchise Foundry Ltd</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-sm italic text-slate-400 mt-2">Discover. Connect. Franchise.</p>
          </div>

          {/* Signed badge */}
          {signed && signerName && signedAt && (
            <div className="mx-10 mt-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-emerald-800">
                <strong>Signed copy</strong> — executed by <strong>{signerName}</strong> on{' '}
                {new Date(signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Document body */}
          <div
            className="agreement-doc px-10 pt-6 pb-10"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* Footer */}
          <div className="border-t border-slate-100 px-10 py-4 flex items-center justify-between bg-slate-50 rounded-b-sm">
            <p className="text-xs text-slate-400">Franchise Foundry Ltd · connect@franchisefoundry.co.uk</p>
            <p className="text-xs text-slate-400">Governed by the laws of England and Wales</p>
          </div>
        </div>
      </div>
    </>
  )
}
