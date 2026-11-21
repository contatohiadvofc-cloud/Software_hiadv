import { test, expect } from '@playwright/test'

test('o site de apresentação abre em hiadv.com.br e leva ao questionário e ao acesso', async ({ page }) => {
  await page.goto('/?ref=ABC2345')
  await expect(page.getByRole('heading', { level: 1, name: 'Seu escritório inteiro, num só lugar.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Aderir ao HiAdv' }).first()).toHaveAttribute('href', '/aderir?ref=ABC2345')
  await expect(page.getByRole('link', { name: 'Já tenho acesso' })).toHaveAttribute('href', '/login')
  await expect(page.getByRole('link', { name: 'Falar com o HiAdv no WhatsApp' })).toHaveAttribute('href', /wa\.me\/5549999730572/)
  await page.getByRole('button', { name: /Assistir à apresentação/ }).click()
  await expect(page.locator('#video-apresentacao')).toHaveAttribute('src', /\/video\/hiadv-apresentacao/)
  await page.getByRole('button', { name: 'Fechar' }).click()
  // botão de instalar só aparece quando o navegador oferece
  for (const b of await page.locator('[data-instalar]').all()) await expect(b).toBeHidden()
  await page.getByRole('link', { name: 'Já tenho acesso' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Entrar no HiAdv' })).toBeVisible()
})

test('o tour troca a tela pelo clique e pelas setas', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /Atendimentos/ }).click()
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
