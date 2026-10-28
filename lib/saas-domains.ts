// A small client for the SaaS Custom Domains API.
// Docs: https://docs.saascustomdomains.com/custom-domains
const API_URL = process.env.SCD_API_URL ?? 'https://app.saascustomdomains.com'

type DomainResponse = { uuid: string; host: string; status: string }
type VerifyResponse = { dns_status: 'valid' | 'pending' | 'invalid' }

export class SaasDomainsError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`SaaS Custom Domains API ${status}: ${body}`)
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: object,
): Promise<T> {
  const account = process.env.SCD_ACCOUNT_UUID
  const upstream = process.env.SCD_UPSTREAM_UUID
  const url =
    `${API_URL}/api/v1/accounts/${account}` +
    `/upstreams/${upstream}/custom_domains${path}`

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SCD_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new SaasDomainsError(res.status, await res.text())
  return res.json() as Promise<T>
}

export function createDomain(host: string, instructionsRecipient?: string) {
  return request<DomainResponse>('POST', '', {
    host,
    // We email this address the exact DNS records to add.
    ...(instructionsRecipient && {
      instructions_recipient: instructionsRecipient,
    }),
  })
}

export function verifyDns(uuid: string) {
  return request<VerifyResponse>('POST', `/${uuid}/verify_dns_records`)
}

export async function deleteDomain(uuid: string) {
  try {
    await request('DELETE', `/${uuid}`)
  } catch (e) {
    // Already gone is fine: the goal is that it doesn't exist.
    if (!(e instanceof SaasDomainsError && e.status === 404)) throw e
  }
}
