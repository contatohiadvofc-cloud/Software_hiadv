import { defineConfig } from '@playwright/test'
// Rodar: npx playwright test --config scripts/tutoriais.config.ts  (gera vídeos em video-tutoriais/bruto)
export default defineConfig({
  testDir: '.', testMatch: 'tutoriais.spec.ts', timeout: 120000, workers: 2,
  outputDir: '../video-tutoriais/bruto',
  projects: [
    { name: 'vertical', use: { viewport: { width: 432, height: 768 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, video: { mode: 'on', size: { width: 432, height: 768 } } } },
    { name: 'horizontal', use: { viewport: { width: 1280, height: 720 }, video: { mode: 'on', size: { width: 1280, height: 720 } } } },
  ],
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: { command: 'npm run build && npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: true, timeout: 120000 },
})
