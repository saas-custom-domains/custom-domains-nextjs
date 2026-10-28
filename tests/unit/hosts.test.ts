import { describe, expect, it } from 'vitest'
import {
  isReservedHost,
  isValidHost,
  normalizeHost,
} from '@/lib/hosts'
import { secureCompare } from '@/lib/secure-compare'

describe('normalizeHost', () => {
  it('lowercases and strips the port and trailing dot', () => {
    expect(normalizeHost(' Links.Acme.com.:443 ')).toBe('links.acme.com')
  })
})

describe('isValidHost', () => {
  it.each(['links.acme.com', 'acme.co.uk', 'xn--bcher-kva.example'])(
    'accepts %s',
    (host) => expect(isValidHost(host)).toBe(true),
  )
  it.each(['acme', '-acme.com', 'acme..com', 'ac me.com', 'https://a.com'])(
    'rejects %s',
    (host) => expect(isValidHost(host)).toBe(false),
  )
})

describe('isReservedHost', () => {
  it('blocks our own domain and its subdomains', () => {
    expect(isReservedHost('linkpage.app')).toBe(true)
    expect(isReservedHost('admin.linkpage.app')).toBe(true)
    expect(isReservedHost('notlinkpage.app')).toBe(false)
  })
})

describe('secureCompare', () => {
  it('compares strings of any length', () => {
    expect(secureCompare('abc', 'abc')).toBe(true)
    expect(secureCompare('abd', 'abc')).toBe(false)
    expect(secureCompare('ab', 'abc')).toBe(false)
  })
})
