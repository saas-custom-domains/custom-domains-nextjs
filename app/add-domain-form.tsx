'use client'

import { useActionState } from 'react'
import { addDomainAction } from './actions'

export function AddDomainForm({ siteId }: { siteId: number }) {
  const [state, action, pending] = useActionState(addDomainAction, null)

  return (
    <form action={action} className="mt-4 flex flex-wrap gap-2">
      <input type="hidden" name="siteId" value={siteId} />
      <input
        name="host"
        required
        placeholder="links.example.com"
        aria-label="Domain"
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2"
      />
      <input
        name="dnsContact"
        type="email"
        placeholder="DNS contact (optional)"
        aria-label="DNS contact email"
        className="flex-1 rounded-lg border border-zinc-300 px-3 py-2"
      />
      <button
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-white"
      >
        Add domain
      </button>
      {state?.error && (
        <p role="alert" className="w-full text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  )
}
