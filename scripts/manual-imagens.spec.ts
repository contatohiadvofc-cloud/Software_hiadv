// Gera as imagens do manual a partir da prévia (escritório fictício) e grava onde cada marcador aponta.
// Rodar: npx playwright test --config scripts/manual.config.ts
import { test } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { MANUAL } from '../src/data/manual'

test('imagens do manual', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('hiadv-demo-coder', '1'))
  await page.goto('/experimentar')
  await page.waitForTimeout(1500)
  await page.addStyleTag({ content: '.previa-barra, .previa-cartao, .previa-fim { display: none !important; } *, *::before, *::after { transition: none !important; animation: none !important; }' })
  const pos: Record<string, { w: number; h: number; m: Record<number, { x: number; y: number; w: number; h: number } | null> }> = {}
  for (const p of MANUAL) {
    await page.evaluate((r) => { history.pushState(null, '', r); dispatchEvent(new PopStateEvent('popstate')) }, p.rota)
    await page.waitForTimeout(1200)
    await page.addStyleTag({ content: '.previa-barra, .previa-cartao, .previa-fim { display: none !important; }' })
    const vw = 1280, vh = 800
    const m: Record<number, { x: number; y: number; w: number; h: number } | null> = {}
    for (const k of p.marcadores) {
      const b = await page.locator(k.alvo).first().boundingBox({ timeout: 2000 }).catch(() => null)
      m[k.n] = b && b.y < vh ? { x: +(b.x / vw * 100).toFixed(2), y: +(b.y / vh * 100).toFixed(2), w: +(Math.min(b.width, vw - b.x) / vw * 100).toFixed(2), h: +(Math.min(b.height, vh - b.y) / vh * 100).toFixed(2) } : null
    }
    await page.screenshot({ path: `public/manual/${p.id}.jpg`, type: 'jpeg', quality: 82 })
    pos[p.id] = { w: vw, h: vh, m }
  }
  writeFileSync('src/data/manualPosicoes.json', JSON.stringify(pos, null, 1))
})
