import { test, expect } from '@playwright/test'

test('manifesto do aplicativo responde com nome e início certos', async ({ request }) => {
  const r = await request.get('/manifest.webmanifest')
  expect(r.ok()).toBe(true)
  const m = await r.json()
  expect(m.short_name).toBe('HiAdv')
  expect(m.start_url).toBe('/app.html?origem=app')
  expect(m.id).toBe('/seu-dia')
  expect((await request.get('/404.html')).ok()).toBe(true)
})

test('o service worker registra', async ({ page }) => {
  await page.goto('/login')
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), { timeout: 10000 }).toBe(true)
})

test('CNAME do domínio vai junto na publicação', async ({ request }) => {
  const r = await request.get('/CNAME')
  expect((await r.text()).trim()).toBe('hiadv.com.br')
})

test('prévia do link: imagem de compartilhamento declarada e publicada', async ({ page, request }) => {
  await page.goto('/login')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://hiadv.com.br/og-hiadv.png')
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  const r = await request.get('/og-hiadv.png')
  expect(r.ok()).toBe(true)
  expect(r.headers()['content-type']).toContain('image/png')
})

test('o app instalado abre no sistema, não no site de apresentação', async ({ page }) => {
  await page.goto('/app.html?origem=app')
  await expect(page).not.toHaveURL(/app\.html/)
  await expect(page.locator('[data-entrar]')).toHaveCount(0)
})
