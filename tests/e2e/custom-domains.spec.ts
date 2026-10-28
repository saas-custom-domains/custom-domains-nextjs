import { expect, test } from '@playwright/test'

// Customer domains go through the mock proxy (see playwright.config.ts).
const customerUrl = (host: string) => `http://${host}/`

test('connect a domain, serve the site through the proxy, remove it', async ({
  page,
}) => {
  const host = `acme-${Date.now()}.test`
  const site = page.getByTestId('site-acme')

  await page.goto('/')
  await site.getByLabel('Domain').fill(host)
  await site.getByRole('button', { name: 'Add domain' }).click()
  const row = page.getByTestId(`domain-${host}`)
  await expect(row).toBeVisible()

  // The mock marks *.test as pointed after ~2s and sends webhooks.
  await expect(async () => {
    await page.reload()
    await expect(row).toContainText('Live')
  }).toPass({ timeout: 15_000 })

  await page.goto(customerUrl(host))
  await expect(page.getByRole('heading', { name: 'Acme Coffee' })).toBeVisible()
  await expect(page).toHaveTitle('Acme Coffee')

  // A Server Action on the custom domain, through the proxy.
  await page.getByLabel('Email').fill('reader@example.com')
  await page.getByRole('button', { name: 'Subscribe' }).click()
  await expect(page.getByRole('status')).toHaveText('Subscribed to Acme Coffee.')

  await page.goto('/')
  await row.getByRole('button', { name: 'Remove' }).click()
  await expect(row).toBeHidden()
  const gone = await page.goto(customerUrl(host))
  expect(gone?.status()).toBe(404)
})

test('a domain that does not point at us stays pending', async ({ page }) => {
  const host = `links-${Date.now()}.example.com`
  const site = page.getByTestId('site-globex')

  await page.goto('/')
  await site.getByLabel('Domain').fill(host)
  await site.getByRole('button', { name: 'Add domain' }).click()
  const row = page.getByTestId(`domain-${host}`)
  await row.getByRole('button', { name: 'Check DNS' }).click()
  await expect(row).toContainText('Waiting for DNS')

  await row.getByRole('button', { name: 'Remove' }).click()
  await expect(row).toBeHidden()
})

test('rejects our own domains and invalid input', async ({ page }) => {
  const site = page.getByTestId('site-acme')
  await page.goto('/')
  await site.getByLabel('Domain').fill('admin.linkpage.app')
  await site.getByRole('button', { name: 'Add domain' }).click()
  await expect(site.getByRole('alert')).toHaveText("That's one of our domains.")
})

test('requests that skip the proxy cannot claim a domain', async ({
  request,
}) => {
  const spoofed = await request.get('/', {
    headers: { 'X-Served-For': 'acme.test' },
  })
  expect(spoofed.status()).toBe(403)

  const wrongToken = await request.get('/', {
    headers: {
      'X-Served-For': 'acme.test',
      'X-SaaS-Domains-Auth-Token': 'guess',
    },
  })
  expect(wrongToken.status()).toBe(403)
})

test('webhooks need the right token', async ({ request }) => {
  const res = await request.post('/api/webhooks/saascustomdomains?token=x', {
    data: { event: 'domain_dns_proxy_record_valid', domain: { uuid: 'x' } },
  })
  expect(res.status()).toBe(401)
})

test('unknown domains get a 404', async ({ page }) => {
  const res = await page.goto(customerUrl('unknown.test'))
  expect(res?.status()).toBe(404)
})
