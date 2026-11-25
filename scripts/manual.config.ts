import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: 'manual-imagens.spec.ts', timeout: 180000,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 },
  webServer: { command: 'npm run build && npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 120000 },
})
