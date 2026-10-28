import { cacheLife, cacheTag } from 'next/cache'
import { headers } from 'next/headers'
import { findSiteByActiveHost } from './domains'

// Cached per host: the host is an argument, so it's part of the cache
// key, and one customer's page can never be served on another's domain.
export async function getSite(host: string) {
  'use cache'
  cacheLife('hours')
  cacheTag(siteTag(host))
  return findSiteByActiveHost(host)
}

export const siteTag = (host: string) => `site:${host}`

// The site for the current request, as resolved by proxy.ts. Use this
// in Server Actions: they can be called from any URL, so don't take
// the site from the form or the page.
export async function getRequestSite() {
  const host = (await headers()).get('x-site-host')
  return host ? getSite(host) : null
}
