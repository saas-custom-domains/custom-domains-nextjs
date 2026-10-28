import { isActiveHost } from '@/lib/domains'
import { normalizeHost } from '@/lib/hosts'

// Caddy calls this before issuing a certificate on demand
// (DOMAINS_PROVIDER=caddy). 200 = go ahead, anything else = refuse.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const host = normalizeHost(params.get('domain') ?? '')
  return new Response(null, { status: isActiveHost(host) ? 200 : 404 })
}
