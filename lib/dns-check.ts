import { resolveCname, resolve4 } from 'node:dns/promises'

// Used when you run the proxy yourself (DOMAINS_PROVIDER=caddy).
// With SaaS Custom Domains, the API checks DNS for you.
const CNAME_TARGET = (process.env.CNAME_TARGET ?? 'in.linkpage.app')
  .toLowerCase()
const SERVER_IPS = (process.env.SERVER_IPS ?? '').split(',').filter(Boolean)

export async function pointsAtUs(host: string): Promise<boolean> {
  // *.localhost always resolves to this machine.
  if (host.endsWith('.localhost')) return true

  const [cnames, ips] = await Promise.all([
    resolveCname(host).catch(() => []),
    resolve4(host).catch(() => []),
  ])
  return (
    cnames.some((c) => c.toLowerCase().replace(/\.$/, '') === CNAME_TARGET) ||
    ips.some((ip) => SERVER_IPS.includes(ip))
  )
}
