'use server'

import { refresh, updateTag } from 'next/cache'
import { checkDomain, removeDomain, addDomain } from '@/lib/domain-service'
import { findDomain } from '@/lib/domains'
import { isReservedHost, isValidHost, normalizeHost } from '@/lib/hosts'
import { siteTag } from '@/lib/sites'

export type FormState = { error: string } | null

// This example has no login. In your app, check that the signed-in
// user owns the site (and the domain) in every one of these actions.

export async function addDomainAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const siteId = Number(formData.get('siteId'))
  const host = normalizeHost(String(formData.get('host') ?? ''))
  const dnsContact = String(formData.get('dnsContact') ?? '') || undefined

  if (!isValidHost(host)) return { error: `"${host}" isn't a valid domain.` }
  if (isReservedHost(host)) return { error: "That's one of our domains." }

  try {
    await addDomain(siteId, host, dnsContact)
  } catch (e) {
    if (String(e).includes('UNIQUE')) {
      return { error: `${host} is already connected to a site.` }
    }
    console.error(e)
    return { error: 'Could not add the domain. Try again.' }
  }
  refresh()
  return null
}

export async function checkDomainAction(formData: FormData) {
  const domain = findDomain(Number(formData.get('domainId')))
  if (!domain) return
  await checkDomain(domain)
  updateTag(siteTag(domain.host))
  refresh()
}

export async function removeDomainAction(formData: FormData) {
  const domain = findDomain(Number(formData.get('domainId')))
  if (!domain) return
  await removeDomain(domain)
  updateTag(siteTag(domain.host))
  refresh()
}
