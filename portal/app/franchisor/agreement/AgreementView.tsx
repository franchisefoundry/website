'use client'

import { useState } from 'react'

interface Comment {
  id: string
  body: string
  section_ref: string | null
  resolved: boolean
  created_at: string
  author_id: string
}

interface Props {
  franchisorAgreement: {
    id: string
    status: string
    sent_at: string | null
    signed_at: string | null
    signer_name: string | null
    signed_pdf_path: string | null
  } | null
  agreementContent: string
  agreementTitle: string
  agreementVersion: number
  comments: Comment[]
  userFullName: string | null
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-8 mb-4 text-slate-900">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-2 text-slate-800 border-b pb-1">$2</h2>'.replace('$2', '$1'))
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1 text-slate-700">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-6 list-disc mb-1">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, m => `<ul class="mb-3">${m}</ul>`)
    .replace(/\n\n/g, '</p><p class="mb-3 text-slate-700 leading-relaxed">')
    .replace(/^(?!<[hul])(.+)$/gm, '<p class="mb-3 text-slate-700 leading-relaxed">$1</p>')
}

export default function AgreementView({
  franchisorAgreement: fa,
  agreementContent,
  agreementTitle,
  agreementVersion,
  comments: initialComments,
  userFullName,
}: Props) {
  const [showSignModal, setShowSignModal] = useState(false)
  const [signerName, setSignerName] = useState(userFullName ?? '')
  const [consent, setConsent] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(fa?.status === 'signed')
  const [signedName, setSignedName] = useState(fa?.signer_name ?? '')

  const [comments, setComments] = useState(initialComments)
  const [commentBody, setCommentBody] = useState('')
  const [commentSection, setCommentSection] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  async function handleSign() {
    if (!signerName.trim() || !consent) return
    setSigning(true)
    try {
      const res = await fetch('/api/franchisor/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error ?? 'Failed to sign'); return }
      setSigned(true)
      setSignedName(signerName.trim())
      setShowSignModal(false)
    } finally {
      setSigning(false)
    }
  }

  async function handleComment() {
    if (!commentBody.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch('/api/franchisor/agreement/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentBody, sectionRef: commentSection }),
      })
      const d = await res.json()
      if (!res.ok) { alert(d.error ?? 'Failed to submit comment'); return }
      setComments(prev => [d.comment, ...prev])
      setCommentBody('')
      setCommentSection('')
    } finally {
      setSubmittingComment(false)
    }
  }

  const isSent = fa?.status === 'sent' || fa?.status === 'signed'

  if (!fa || fa.status === 'not_sent') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">Your agreement hasn&apos;t been sent yet</p>
        <p className="text-slate-400 text-sm mt-1">We&apos;ll notify you when it&apos;s ready to review and sign.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Status banner */}
      {signed ? (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">Agreement signed</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Signed by <strong>{signedName}</strong> on{' '}
              {fa.signed_at ? new Date(fa.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'recently'}.
            </p>
          </div>
          {fa.signed_pdf_path && (
            <a
              href="/api/franchisor/agreement/download"
              className="text-sm text-emerald-700 font-medium hover:underline whitespace-nowrap"
            >
              Download PDF
            </a>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Awaiting your signature</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Please read the agreement below. When you&apos;re ready, click <strong>Sign agreement</strong>.
              If you have questions about any clause, use the comment box below.
            </p>
          </div>
          <button
            onClick={() => setShowSignModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Sign agreement
          </button>
        </div>
      )}

      {/* Agreement document */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">{agreementTitle}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Version {agreementVersion}</p>
          </div>
        </div>
        <div
          className="px-8 py-6 prose prose-slate max-w-none text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(agreementContent) }}
        />
      </div>

      {/* Comments */}
      {!signed && (
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800">Comments &amp; questions</h3>
          <p className="text-sm text-slate-500">
            Have a question about a specific clause? Leave a comment and we&apos;ll come back to you before you sign.
          </p>

          {/* Add comment form */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <input
              type="text"
              placeholder={'Clause reference (optional, e.g. "Section 3.2")'}
              value={commentSection}
              onChange={e => setCommentSection(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
            <textarea
              placeholder="Your question or comment…"
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
            <button
              onClick={handleComment}
              disabled={submittingComment || !commentBody.trim()}
              className="bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {submittingComment ? 'Sending…' : 'Submit comment'}
            </button>
          </div>

          {/* Existing comments */}
          {comments.length > 0 && (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className={`rounded-xl border px-4 py-3 ${c.resolved ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                  {c.section_ref && (
                    <p className="text-xs font-medium text-brand-green mb-1">{c.section_ref}</p>
                  )}
                  <p className="text-sm text-slate-700">{c.body}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {c.resolved && (
                      <span className="text-xs text-emerald-600 font-medium">✓ Resolved</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sign modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowSignModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Sign agreement</h3>
            <p className="text-sm text-slate-500 mb-5">
              By typing your full legal name and clicking <strong>Sign</strong>, you confirm you have read the agreement and agree to be bound by its terms.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full legal name</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                  autoFocus
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
                />
                <span className="text-sm text-slate-600">
                  I have read and understood the full agreement. I agree that typing my name above constitutes my electronic signature and creates a legally binding contract.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSignModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing || !signerName.trim() || !consent}
                  className="flex-1 bg-brand-green hover:bg-brand-green-dark text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {signing ? 'Signing…' : 'Sign agreement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
