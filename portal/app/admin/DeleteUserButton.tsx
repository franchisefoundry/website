'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  name: string
  endpoint: string // e.g. '/api/admin/franchisees/[id]'
  redirectTo?: string
}

export default function DeleteUserButton({ id, name, endpoint, redirectTo }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(endpoint.replace('[id]', id), { method: 'DELETE' })
      if (res.ok) {
        if (redirectTo) router.push(redirectTo)
        else router.refresh()
      } else {
        const { error } = await res.json()
        console.error('Delete error:', error)
        setDeleting(false)
        setConfirming(false)
      }
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Remove {name}?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
        >
          {deleting ? 'Removing…' : 'Yes, remove'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-400 hover:text-red-600 transition-colors"
      title={`Remove ${name}`}
    >
      Remove
    </button>
  )
}
