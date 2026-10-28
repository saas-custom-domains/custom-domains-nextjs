import { defineConfig } from 'vitest/config'
import path from 'node:path'
import os from 'node:os'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    env: {
      DATA_DIR: path.join(os.tmpdir(), `linkpage-test-${process.pid}`),
      APP_HOSTS: 'localhost,linkpage.app',
      APP_DOMAIN: 'linkpage.app',
      PROXY_AUTH_TOKEN: 'test_token',
    },
  },
})
