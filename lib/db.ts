import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

let instance: DatabaseSync | undefined

// One connection per server process, opened on first use so that
// `next build` never touches it. Swap for Postgres in a real app; the
// queries are plain SQL.
export function db() {
  instance ??= open()
  return instance
}

function open() {
  const dir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data')
  mkdirSync(dir, { recursive: true })
  const db = new DatabaseSync(path.join(dir, 'app.db'), { timeout: 5000 })
  migrate(db)
  seed(db)
  return db
}

function migrate(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      bio TEXT NOT NULL,
      links TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_domains (
      id INTEGER PRIMARY KEY,
      site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      host TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active')),
      https_ready INTEGER NOT NULL DEFAULT 0,
      provider_uuid TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY,
      site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      UNIQUE (site_id, email)
    );
  `)
}

function seed(db: DatabaseSync) {
  const seeded = db.prepare('SELECT COUNT(*) AS n FROM sites').get() as {
    n: number
  }
  if (seeded.n === 0) {
    const insert = db.prepare(
      'INSERT INTO sites (slug, name, bio, links) VALUES (?, ?, ?, ?)',
    )
    insert.run(
      'acme',
      'Acme Coffee',
      'Small-batch roasters. New beans every Friday.',
      JSON.stringify([
        { label: 'Shop beans', url: 'https://example.com/shop' },
        { label: 'Brewing guides', url: 'https://example.com/guides' },
      ]),
    )
    insert.run(
      'globex',
      'Globex Studio',
      'Product design for teams that ship.',
      JSON.stringify([
        { label: 'Portfolio', url: 'https://example.com/work' },
        { label: 'Book a call', url: 'https://example.com/call' },
      ]),
    )
  }
}
