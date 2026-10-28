import { NextResponse, type NextRequest } from 'next/server'
import { isActiveHost } from '@/lib/domains'
import { isAppHost, normalizeHost } from '@/lib/hosts'
import { secureCompare } from '@/lib/secure-compare'

export function proxy(request: NextRequest) {
  // Behind SaaS Custom Domains, Host is your own hostname and the
  // customer's domain arrives in X-Served-For. Only trust it with the
  // upstream's auth token, or anyone could claim any customer's domain.
  const servedFor = request.headers.get('x-served-for')
  if (servedFor !== null && !hasValidProxyToken(request)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const host = normalizeHost(servedFor ?? request.headers.get('host') ?? '')
  const { pathname } = request.nextUrl

  // x-site-host tells the app which site this request is for. Never
  // accept one from the outside.
  const headers = new Headers(request.headers)
  headers.delete('x-site-host')

  if (isAppHost(host)) {
    // Customer sites are only reachable on their own domain.
    if (pathname.startsWith('/sites/')) {
      return new NextResponse('Not found', { status: 404 })
    }
    return NextResponse.next({ request: { headers } })
  }

  if (!isActiveHost(host)) {
    return new NextResponse('Unknown domain', { status: 404 })
  }

  headers.set('x-site-host', host)
  if (servedFor !== null) {
    // Server Actions compare the browser's Origin with x-forwarded-host,
    // which the proxy sets to your own hostname. Tell Next.js the
    // customer's domain instead, now that the token proved where the
    // request came from.
    headers.set('x-forwarded-host', host)
  }

  const url = request.nextUrl.clone()
  url.pathname = `/sites/${host}${pathname}`
  return NextResponse.rewrite(url, { request: { headers } })
}

function hasValidProxyToken(request: NextRequest) {
  const expected = process.env.PROXY_AUTH_TOKEN
  const token = request.headers.get('x-saas-domains-auth-token') ?? ''
  return Boolean(expected) && secureCompare(token, expected!)
}

export const config = {
  // Everything except static assets and the health check, which load
  // balancers call by IP address. Server Actions are POSTs to the
  // page's own path, so they go through here too.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/up$).*)'],
}
