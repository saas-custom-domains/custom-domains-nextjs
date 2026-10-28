import { beforeAll, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { getRewrittenUrl } from 'next/experimental/testing/server'
import { db } from '@/lib/db'
import { proxy } from '@/proxy'

function request(path: string, headers: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, { headers })
}

beforeAll(() => {
  db().exec(`
    DELETE FROM custom_domains;
    INSERT INTO custom_domains (site_id, host, status) VALUES
      (1, 'links.acme.com', 'active'),
      (2, 'links.globex.com', 'pending');
  `)
})

describe('proxy', () => {
  it('passes requests for the app itself through', () => {
    const res = proxy(request('/', { host: 'linkpage.app' }))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('hides /sites/* on the app host', () => {
    const res = proxy(request('/sites/links.acme.com', { host: 'localhost' }))
    expect(res.status).toBe(404)
  })

  it('rewrites an active custom domain to its site', () => {
    const res = proxy(request('/about', { host: 'links.acme.com' }))
    expect(getRewrittenUrl(res)).toBe(
      'http://localhost:3000/sites/links.acme.com/about',
    )
  })

  it('returns 404 for pending and unknown domains', () => {
    expect(proxy(request('/', { host: 'links.globex.com' })).status).toBe(404)
    expect(proxy(request('/', { host: 'evil.example' })).status).toBe(404)
  })

  it('reads X-Served-For when the proxy token is valid', () => {
    const res = proxy(
      request('/', {
        host: 'linkpage.app',
        'x-served-for': 'links.acme.com',
        'x-saas-domains-auth-token': 'test_token',
      }),
    )
    expect(getRewrittenUrl(res)).toBe(
      'http://localhost:3000/sites/links.acme.com',
    )
    expect(
      res.headers.get('x-middleware-request-x-forwarded-host'),
    ).toBe('links.acme.com')
  })

  it('rejects X-Served-For without the right token', () => {
    const spoofed = { host: 'linkpage.app', 'x-served-for': 'links.acme.com' }
    expect(proxy(request('/', spoofed)).status).toBe(403)
    expect(
      proxy(
        request('/', { ...spoofed, 'x-saas-domains-auth-token': 'nope' }),
      ).status,
    ).toBe(403)
  })

  it('drops an x-site-host header sent by the client', () => {
    const res = proxy(
      request('/', { host: 'localhost', 'x-site-host': 'links.acme.com' }),
    )
    expect(res.headers.get('x-middleware-request-x-site-host')).toBeNull()
  })
})
