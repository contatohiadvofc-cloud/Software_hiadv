import { test, expect } from '@playwright/test'

test('o site de apresentação abre em hiadv.com.br e leva ao questionário e ao acesso', async ({ page }) => {
  await page.goto('/?ref=ABC2345')
  await expect(page.getByRole('heading', { level: 1, name: 'Seu escritório inteiro, num só lugar.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Aderir ao HiAdv' }).first()).toHaveAttribute('href', '/aderir?ref=ABC2345')
  await expect(page.getByRole('link', { name: 'Ver o sistema por dentro' })).toHaveAttribute('href', '#experimentar')
  await expect(page.getByRole('link', { name: 'Falar com o HiAdv no WhatsApp' })).toHaveAttribute('href', /wa\.me\/5549999730572/)
  await page.getByRole('button', { name: /Assistir à apresentação/ }).click()
  await expect(page.locator('#video-apresentacao')).toHaveAttribute('src', /\/video\/hiadv-apresentacao/)
  await page.getByRole('button', { name: 'Fechar' }).click()
  // botão de instalar só aparece quando o navegador oferece
  for (const b of await page.locator('[data-instalar]').all()) await expect(b).toBeHidden()
  await page.getByRole('link', { name: 'Entrar', exact: true }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar no HiAdv' })).toBeVisible()
})

test('o tour troca a tela pelo clique e pelas setas', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tablist', { name: 'Telas do HiAdv' }).getByRole('tab', { name: /Atendimentos/ }).click()
  await expect(page.locator('#tour-img')).toHaveAttribute('src', '/site/atendimentos.webp')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('tab', { name: /Casos por etapas/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#tour-img')).toHaveAttribute('src', '/site/quadro.webp')
})

test('quem já entrou vê "Abrir o HiAdv"', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sb-teste-auth-token', '{}'))
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Abrir o HiAdv' }).first()).toHaveAttribute('href', '/seu-dia')
})

test('site acessível (axe)', async ({ page }) => {
  await page.goto('/')
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  const r = await new AxeBuilder({ page }).analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([])
})

test('login e questionário têm caminho de volta ao site', async ({ page }) => {
  await page.goto('/aderir')
  await expect(page.getByRole('link', { name: 'Voltar ao site' })).toHaveAttribute('href', '/')
  await page.goto('/login')
  await page.locator('[data-estatico]').waitFor({ state: 'detached' })
  await page.getByRole('link', { name: 'Voltar ao site' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Seu escritório inteiro, num só lugar.' })).toBeVisible()
})

test('áreas de atuação: as abas trocam o caminho do caso', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Para todas as áreas da advocacia' })).toBeVisible()
  await expect(page.getByRole('tabpanel', { name: 'Trabalhista' })).toContainText('Aguardando audiência')
  await page.getByRole('tab', { name: 'Penal' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Penal' })).toContainText('Fazendo a defesa')
  await expect(page.getByRole('tabpanel', { name: 'Trabalhista' })).toBeHidden()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Previdenciário' })).toHaveAttribute('aria-selected', 'true')
})

test('por dentro do HiAdv: cada tela tem título e abre em tamanho grande', async ({ page }) => {
  await page.goto('/')
  const secao = page.locator('#por-dentro')
  await expect(secao.getByRole('heading', { level: 2, name: 'Por dentro do HiAdv' })).toBeVisible()
  const itens = secao.locator('.sv-gal > li')
  expect(await itens.count()).toBeGreaterThanOrEqual(15)
  for (const li of await itens.all()) {
    await expect(li.locator('h4')).not.toBeEmpty()
    await expect(li.locator('p')).not.toBeEmpty()
  }
  await secao.getByRole('button', { name: 'Ampliar a tela Financeiro' }).click()
  const dlg = page.getByRole('dialog', { name: 'Financeiro' })
  await expect(dlg).toBeVisible()
  await expect(dlg.locator('img')).toHaveAttribute('src', '/site/tela-financeiro.webp')
  await expect.poll(() => dlg.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(2560)
  await dlg.getByRole('button', { name: 'Fechar' }).click()
  await expect(dlg).toBeHidden()
  await expect(secao.getByRole('button', { name: 'Ampliar a tela Financeiro' })).toBeFocused()
})

test('experimente: cada parada do roteiro troca a tela e abre a mesma tela na prévia', async ({ page }) => {
  await page.goto('/')
  const lista = page.getByRole('tablist', { name: 'Roteiro da prévia' })
  await lista.getByRole('tab', { name: /Financeiro/ }).click()
  await expect(page.locator('#exp-img')).toHaveAttribute('src', '/site/tela-financeiro.webp')
  const abrir = page.getByRole('link', { name: 'Abrir esta tela na prévia' })
  await expect(abrir).toHaveAttribute('href', '/experimentar?ir=%2Ffinanceiro')
  await abrir.click()
  await expect(page).toHaveURL(/\/financeiro/)
  await expect(page.getByRole('region', { name: 'Prévia do HiAdv' })).toContainText('Financeiro')
})
