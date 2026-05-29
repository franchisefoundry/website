'use client'

export function FranchisorPreviewButton({ franchisorId }: { franchisorId: string }) {
  function openPreview() {
    // Short-lived cookie lets all franchisor pages know which brand to preview.
    // Admin stays logged in — no magic link / session switch needed.
    document.cookie = `ff_preview_as=${franchisorId}; path=/; max-age=3600; SameSite=Lax`
    window.open('/franchisor', '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={openPreview}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors whitespace-nowrap"
    >
      <span>👁</span> View as franchisor →
    </button>
  )
}
