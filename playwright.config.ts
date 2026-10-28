import { defineConfig } from '@playwright/test'

// Runs against `docker compose up`: the app on :3000 and the mock
// proxy on :80, so http://<anything>.localhost goes through the proxy.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
})
