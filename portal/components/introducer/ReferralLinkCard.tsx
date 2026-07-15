'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ReferralLinkCard({ link, referredCount }: { link: string; referredCount: number }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — select fallback handled by the input itself
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Your referral link</CardTitle></CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-500">
          Share this link with potential franchisees. Anyone who completes the matching quiz
          through it is automatically attributed to you — you&apos;ll see them in your leads below
          and earn commission if they sign.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={link}
            onFocus={e => e.currentTarget.select()}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
          <Button onClick={copy} className="sm:w-auto">
            {copied ? '✓ Copied' : 'Copy link'}
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{referredCount}</span>
          <span className="text-sm text-slate-500">
            {referredCount === 1 ? 'lead' : 'leads'} referred through your link
          </span>
        </div>
      </CardBody>
    </Card>
  )
}
