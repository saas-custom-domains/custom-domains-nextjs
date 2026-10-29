# Custom domains in Next.js

An example Next.js 16 app where each customer connects their own domain. It's a small link-in-bio product, Linkpage: every site gets a page, and its owner can serve it on `links.theircompany.com` instead of a Linkpage URL.

It goes with the guide [How to Add Custom Domains to a Multi-Tenant Next.js App](https://saascustomdomains.com/blog/posts/custom-domains-nextjs).

What's in it:

- `proxy.ts` finds the site from the request's hostname and rewrites to `/sites/[domain]`. Unknown and unverified domains get a 404.
- Requests from the [SaaS Custom Domains](https://saascustomdomains.com) proxy are accepted only with the upstream's auth token, so nobody can claim a customer's domain by sending `X-Served-For` themselves.
- Server Actions on customer domains (see [Server Actions behind a proxy](#server-actions-behind-a-proxy)).
- Site pages are cached per host with `'use cache'` and invalidated by tag when a domain changes.
- A dashboard to add a domain, check its DNS and remove it. Webhooks update the status.
- [SaaS Custom Domains](https://saascustomdomains.com) issues and renews every customer's TLS certificate and proxies their traffic to the app.

## Run it in 2 minutes

You need Docker.

```bash
git clone https://github.com/saas-custom-domains/custom-domains-nextjs
cd custom-domains-nextjs
docker compose up --build
```

1. Open http://localhost:3000 and add `acme.localhost` to Acme Coffee.
2. Within a few seconds the status changes to **Live**: the mock API "found" the DNS records and sent a webhook.
3. Open http://acme.localhost. The request goes through the mock proxy on port 80, exactly like a real customer domain goes through SaaS Custom Domains, and you see Acme's page. Try the subscribe form.

`*.localhost` always resolves to your own machine in Chrome, Firefox, Safari and curl, so there's nothing to add to `/etc/hosts`.

The mock is [scd-mock](https://github.com/saas-custom-domains/scd-mock): a local copy of the SaaS Custom Domains API and proxy, so you can try everything without an account.

### Run the app outside Docker

Keep the mock in Docker and point it at your dev server:

```bash
SCD_MOCK_UPSTREAM_HOST=host.docker.internal \
SCD_MOCK_WEBHOOK_URL=http://host.docker.internal:3000/api/webhooks/saascustomdomains \
  docker compose up scd-mock -d
npm install
cp .env.example .env.local
npm run dev
```

## How it works

```
Browser ── acme.com ──▶ SaaS Custom Domains ──▶ your Next.js app
                        (TLS certificate,       Host: app.linkpage.app
                         proxy)                 X-Served-For: acme.com
                                                X-SaaS-Domains-Auth-Token: …
```

| File | What it does |
| --- | --- |
| `proxy.ts` | Checks the proxy token, picks the host, rewrites to `/sites/[host]` |
| `app/sites/[domain]/page.tsx` | The customer's site |
| `app/sites/[domain]/actions.ts` | A Server Action that takes the site from the request, not the form |
| `lib/sites.ts` | `getSite()` cached per host |
| `lib/domain-service.ts` | Add, check and remove domains |
| `lib/saas-domains.ts` | API client for SaaS Custom Domains |
| `app/api/webhooks/saascustomdomains/route.ts` | Webhook endpoint |

### Server Actions behind a proxy

SaaS Custom Domains forwards your app's own hostname in `Host` and `x-forwarded-host`, because that's what hosting platforms route on and what most apps expect. The customer's domain arrives in `x-served-for`.

Next.js checks Server Actions by comparing the browser's `Origin` with `x-forwarded-host` (or `host`). So if your customer-facing pages use Server Actions, Next.js needs to see the customer's domain, or it answers "Invalid Server Actions request". `allowedOrigins` doesn't fit, because it's a fixed list and your customers' domains aren't.

`proxy.ts` handles it: once the auth token proves the request came through the proxy, it sets `x-forwarded-host` to the domain from `x-served-for` before the action runs.

## Use it with your SaaS Custom Domains account

1. [Create an API token](https://app.saascustomdomains.com/api_tokens) and an upstream pointing at your deployed app.
2. Set the environment variables from `.env.example`: `SCD_API_TOKEN`, `SCD_ACCOUNT_UUID`, `SCD_UPSTREAM_UUID`, `PROXY_AUTH_TOKEN` (the upstream's auth token), `SCD_WEBHOOK_TOKEN` (from the webhook you create in the dashboard), and `APP_HOSTS`.
3. Remove `SCD_API_URL` so the client talks to the real API.

`APP_HOSTS` must list every hostname your own traffic arrives on: your app's domain, plus any internal name your platform uses to reach the app. `proxy.ts` treats any other host as a customer domain and returns 404 if it isn't connected. (In `compose.yaml` that's why `app` is listed: webhooks from the mock arrive as `Host: app:3000`.) The health check at `/api/up` skips `proxy.ts`, because load balancers call it by IP address.

Your customers point a CNAME at `in.saascustomdomains.com` (or A records at our two static IPs for a root domain). See the [docs](https://docs.saascustomdomains.com).

## Tests

```bash
npm test                       # unit tests (proxy.ts, hostnames, tokens)
docker compose up -d --build --wait
npx playwright install chromium
npm run test:e2e               # end to end, through the mock proxy
```

The end-to-end tests use `*.test` domains and send the browser's requests for them to the mock proxy, so nothing depends on DNS or on port 80. To run a second stack side by side, set `APP_PORT`, `SCD_MOCK_API_PORT` and `SCD_MOCK_PROXY_PORT` for both `docker compose` and `npm run test:e2e`.

CI runs both on every push and once a week, so a new Next.js release that breaks something shows up here first.

## Tested with

| | Version |
| --- | --- |
| Next.js | 16.4.3 |
| React | 19.3 |
| Node.js | 24 |

Last checked: 2026-10-28.

## Not production-ready on purpose

There's no login. In your app, check in every Server Action that the signed-in user owns the site and the domain. SQLite (`node:sqlite`) keeps the example small; use your own database.

## License

MIT
