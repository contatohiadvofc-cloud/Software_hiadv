// Regera as telas do site (public/site) a partir da prévia, na identidade atual.
// Rodar: npx playwright test --config scripts/site.config.ts
import { test, type Page } from '@playwright/test'
import sharp from 'sharp'

const esconder = '.previa-barra, .previa-cartao, .previa-fim { display: none !important; } *, *::before, *::after { transition: none !important; animation: none !important; }'
async function ir(page: Page, r: string) {
  await page.evaluate((r) => { history.pushState(null, '', r); dispatchEvent(new PopStateEvent('popstate')) }, r)
  await page.waitForTimeout(1200); await page.addStyleTag({ content: esconder })
}
async function salvar(page: Page, nome: string, miniatura = true) {
  const buf = await page.screenshot()
  await sharp(buf).webp({ quality: 80, effort: 6 }).toFile(`public/site/${nome}.webp`)
  if (miniatura) await sharp(buf).resize(1280, 800, { kernel: 'lanczos3' }).webp({ quality: 78, effort: 6 }).toFile(`public/site/${nome}-p.webp`)
}

test('telas do site', async ({ page, browser }) => {
  test.setTimeout(240000)
  await page.goto('/experimentar'); await page.waitForTimeout(1500)
  const rotas: [string, string][] = [['seu-dia', '/seu-dia'], ['atendimentos', '/atendimentos'], ['tarefas', '/tarefas'], ['agenda', '/agenda'],
    ['clientes', '/clientes'], ['publicacoes', '/publicacoes'], ['financeiro', '/financeiro'], ['relatorios', '/relatorios'],
    ['biblioteca', '/biblioteca'], ['configuracoes', '/configuracoes'], ['quadro', '/area/administrativo'], ['integracoes', '/integracoes']]
  for (const [n, r] of rotas) { await ir(page, r); await salvar(page, `tela-${n}`) }
  await ir(page, '/seu-dia'); await sharp(await page.screenshot({ scale: 'device' })).webp({ quality: 82 }).toFile('public/site/produto-seu-dia.webp')
  await page.keyboard.press('Control+k'); await page.waitForTimeout(500); await page.keyboard.type('Rita'); await page.waitForTimeout(700); await salvar(page, 'tela-busca')
  await page.keyboard.press('Escape')
  await ir(page, '/area/administrativo'); await page.getByText('Paula Nunes').first().click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(900); await salvar(page, 'tela-ficha')
  await ir(page, '/clientes'); await page.locator('a[href^="/clientes/"]').first().click(); await page.waitForTimeout(1200); await page.addStyleTag({ content: esconder })
  await salvar(page, 'tela-cliente')
  await page.getByRole('button', { name: /gerar link/i }).first().click({ timeout: 3000 }).catch(() => {})
  const link = await page.inputValue('#acomp-link', { timeout: 3000 }).catch(() => '')
  const ia = page.getByRole('button', { name: /assistente|rascunho com ia|ia$/i }).first()
  if (await ia.count()) { await ia.click(); await page.waitForTimeout(800); await salvar(page, 'tela-ia') }
  await page.keyboard.press('Escape').catch(() => {})
  if (link) { await ir(page, '/acompanhar/' + link.split('acompanhar/')[1]); await page.waitForTimeout(800); await salvar(page, 'tela-acompanhamento') }
  await page.evaluate(() => { localStorage.setItem('hiadv-tema', 'light'); document.documentElement.dataset.theme = 'light' })
  await ir(page, '/seu-dia'); await salvar(page, 'tela-escuro')
  await page.evaluate(() => { localStorage.setItem('hiadv-tema', 'dark'); document.documentElement.dataset.theme = 'dark' })
  // retratos do celular
  const cel = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })
  await cel.goto('/experimentar'); await cel.waitForTimeout(1500)
  for (const [n, r] of [['seu-dia', '/seu-dia'], ['atendimentos', '/atendimentos'], ['publicacoes', '/publicacoes'], ['relatorios', '/relatorios'], ['quadro', '/area/administrativo']]) {
    await ir(cel, r); await sharp(await cel.screenshot()).resize(1080, 1696, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toFile(`public/site/${n}.webp`)
  }
  await ir(cel, '/atendimentos'); await sharp(await cel.screenshot()).resize(800, 1628, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toFile('public/site/produto-celular.webp')
  await ir(cel, '/clientes'); await cel.locator('a[href^="/clientes/"]').first().click(); await cel.waitForTimeout(1200); await cel.addStyleTag({ content: esconder })
  await sharp(await cel.screenshot()).resize(1080, 1696, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toFile('public/site/cliente.webp')
})
