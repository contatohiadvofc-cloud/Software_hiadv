// Telas de Conversas e Recrutamento para o site (public/site). Rodar: npx playwright test --config scripts/site.config.ts site-imagens-equipe
import { test, type Page } from '@playwright/test'
import sharp from 'sharp'

const esconder = '.previa-barra, .previa-cartao, .previa-fim { display: none !important; } *, *::before, *::after { transition: none !important; animation: none !important; }'
async function ir(page: Page, r: string) {
  await page.evaluate((r) => { history.pushState(null, '', r); dispatchEvent(new PopStateEvent('popstate')) }, r)
  await page.waitForTimeout(1200); await page.addStyleTag({ content: esconder })
}
async function salvar(page: Page, nome: string) {
  const buf = await page.screenshot()
  await sharp(buf).webp({ quality: 80, effort: 6 }).toFile(`public/site/${nome}.webp`)
  await sharp(buf).resize(1280, 800, { kernel: 'lanczos3' }).webp({ quality: 78, effort: 6 }).toFile(`public/site/${nome}-p.webp`)
}

test('telas de conversas e recrutamento', async ({ page }) => {
  test.setTimeout(120000)
  await page.goto('/experimentar'); await page.waitForTimeout(1500)
  await ir(page, '/conversas')
  await page.getByText('Previdenciário', { exact: true }).first().click(); await page.waitForTimeout(900)
  await salvar(page, 'tela-conversas')
  await page.getByRole('button', { name: 'Dados do grupo', exact: true }).click(); await page.waitForTimeout(900)
  await salvar(page, 'tela-grupo')
  await page.keyboard.press('Escape')
  await ir(page, '/recrutamento')
  await page.getByText(/assistente de triagem/i).first().click(); await page.waitForTimeout(1200)
  await salvar(page, 'tela-recrutamento')
})
