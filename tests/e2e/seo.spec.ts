import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
const paginas: string[] = JSON.parse(readFileSync('scripts/paginas-seo.json', 'utf8'))

for (const rota of ['/', ...paginas.map((p: string) => `/${p}/`)]) {
  test(`página de busca ${rota}: título, descrição, canônico e acessibilidade`, async ({ page }) => {
    await page.goto(rota)
    await expect(page.locator('h1')).toHaveCount(1)
    expect((await page.title()).length).toBeLessThanOrEqual(80)
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc!.length).toBeGreaterThan(80)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://hiadv.com.br${rota}`)
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([])
  })
}
