import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// Spread first: defineConfig(base, overrides) retains undefined inherited values.
// The harness already runs the built image; never start a source server here.
export default defineConfig({
  ...base,
  webServer: undefined,
  retries: 0,
  workers: 2,
  use: { ...base.use, baseURL: 'http://127.0.0.1:3000' },
})
