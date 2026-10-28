'use client'

import { useActionState } from 'react'
import { subscribe } from './actions'

export function SubscribeForm() {
  const [state, action, pending] = useActionState(
    subscribe,
    null,
  )

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2"
        />
        <button
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white"
        >
          Subscribe
        </button>
      </div>
      {state && (
        <p role="status" className={state.ok ? 'text-green-700' : 'text-red-700'}>
          {state.message}
        </p>
      )}
    </form>
  )
}
