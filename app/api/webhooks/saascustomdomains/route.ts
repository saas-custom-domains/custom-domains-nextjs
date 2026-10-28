import { revalidateTag } from 'next/cache'
import {
  findDomainByProviderUuid,
  setHttpsReady,
  setStatus,
} from '@/lib/domains'
import { secureCompare } from '@/lib/secure-compare'
import { siteTag } from '@/lib/sites'

// Events: https://docs.saascustomdomains.com/webhooks
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  const expected = process.env.SCD_WEBHOOK_TOKEN
  if (!expected || !secureCompare(token, expected)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { event, domain: payload } = await request.json()
  const domain = payload?.uuid && findDomainByProviderUuid(payload.uuid)
  // Not ours (or already removed): acknowledge so it isn't retried.
  if (!domain) return new Response(null, { status: 204 })

  switch (event) {
    case 'domain_dns_proxy_record_valid':
      setStatus(domain.id, 'active')
      break
    case 'domain_dns_proxy_record_invalid':
      setStatus(domain.id, 'pending')
      break
    case 'tls_certificate_issued':
      setHttpsReady(domain.id)
      break
  }
  revalidateTag(siteTag(domain.host), 'max')
  return new Response(null, { status: 204 })
}
