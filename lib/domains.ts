import { db } from './db'

export type Link = { label: string; url: string }
export type Site = {
  id: number
  slug: string
  name: string
  bio: string
  links: Link[]
}
export type CustomDomain = {
  id: number
  site_id: number
  host: string
  status: 'pending' | 'active'
  https_ready: number
  provider_uuid: string | null
}

type SiteRow = Omit<Site, 'links'> & { links: string }

function toSite(row: SiteRow | undefined): Site | null {
  return row ? { ...row, links: JSON.parse(row.links) } : null
}

// The one lookup every customer-facing request depends on.
// Keep the UNIQUE index on custom_domains.host.
export function findSiteByActiveHost(host: string): Site | null {
  const row = db()
    .prepare(
      `SELECT sites.* FROM sites
       JOIN custom_domains ON custom_domains.site_id = sites.id
       WHERE custom_domains.host = ? AND custom_domains.status = 'active'`,
    )
    .get(host) as SiteRow | undefined
  return toSite(row)
}

export function isActiveHost(host: string): boolean {
  return Boolean(
    db()
      .prepare(
        `SELECT 1 FROM custom_domains WHERE host = ? AND status = 'active'`,
      )
      .get(host),
  )
}

export function listSites(): (Site & { domains: CustomDomain[] })[] {
  const sites = (db().prepare('SELECT * FROM sites ORDER BY id').all() as
    SiteRow[]).map((r) => toSite(r)!)
  const domains = db()
    .prepare('SELECT * FROM custom_domains ORDER BY id')
    .all() as CustomDomain[]
  return sites.map((s) => ({
    ...s,
    domains: domains.filter((d) => d.site_id === s.id),
  }))
}

export function findDomain(id: number): CustomDomain | null {
  return (db().prepare('SELECT * FROM custom_domains WHERE id = ?').get(id) ??
    null) as CustomDomain | null
}

export function findDomainByProviderUuid(uuid: string): CustomDomain | null {
  return (db()
    .prepare('SELECT * FROM custom_domains WHERE provider_uuid = ?')
    .get(uuid) ?? null) as CustomDomain | null
}

export function insertDomain(siteId: number, host: string): CustomDomain {
  return db()
    .prepare(
      `INSERT INTO custom_domains (site_id, host) VALUES (?, ?)
       RETURNING *`,
    )
    .get(siteId, host) as CustomDomain
}

export function setStatus(id: number, status: CustomDomain['status']) {
  db().prepare('UPDATE custom_domains SET status = ? WHERE id = ?').run(
    status,
    id,
  )
}

export function setHttpsReady(id: number) {
  db().prepare('UPDATE custom_domains SET https_ready = 1 WHERE id = ?').run(id)
}

export function setProviderUuid(id: number, uuid: string) {
  db().prepare('UPDATE custom_domains SET provider_uuid = ? WHERE id = ?').run(
    uuid,
    id,
  )
}

export function deleteDomain(id: number) {
  db().prepare('DELETE FROM custom_domains WHERE id = ?').run(id)
}

export function addSubscriber(siteId: number, email: string) {
  db().prepare(
    'INSERT OR IGNORE INTO subscribers (site_id, email) VALUES (?, ?)',
  ).run(siteId, email)
}
