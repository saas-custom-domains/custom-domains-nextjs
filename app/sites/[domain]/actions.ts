'use server'

import { addSubscriber } from '@/lib/domains'
import { getRequestSite } from '@/lib/sites'

export type SubscribeState = { ok: boolean; message: string } | null

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const site = await getRequestSite()
  if (!site) return { ok: false, message: 'Unknown site.' }

  const email = String(formData.get('email') ?? '').trim()
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, message: 'Enter a valid email.' }
  }
  addSubscriber(site.id, email)
  return { ok: true, message: `Subscribed to ${site.name}.` }
}
