import { test, expect } from '@playwright/test'
import { simularSupabase } from './mock'

async function abrirLogin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.locator('[data-estatico]').waitFor({ state: 'detached' })
}

test('entrar confere a senha pessoal no servidor da equipe antes de abrir a sessão', async ({ page }) => {
  const est = await simularSupabase(page, {})
  await abrirLogin(page)
  await page.getByLabel('E-mail').fill(' Ana@SilvaPrado.exemplo.br ')
  await page.getByLabel('Senha').fill('certa')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/seu-dia$/)
  expect(est.funcao[0]).toEqual({ equipeEntrar: true, email: 'ana@silvaprado.exemplo.br', senha: 'certa' })
})

test('senha errada mostra quantas tentativas restam', async ({ page }) => {
  await simularSupabase(page, {})
  await abrirLogin(page)
  await page.getByLabel('E-mail').fill('ana@silvaprado.exemplo.br')
  await page.getByLabel('Senha').fill('errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText(/E-mail ou senha incorretos\. Restam 4 tentativas/)).toBeVisible()
})

test('primeiro acesso: a senha mestra leva a criar a senha pessoal e já entra', async ({ page }) => {
  const est = await simularSupabase(page, { loginEquipe: 'primeiro_acesso' })
  await abrirLogin(page)
  await page.getByLabel('E-mail').fill('ana@silvaprado.exemplo.br')
  await page.getByLabel('Senha').fill('mestra-ficticia')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Criar a sua senha' })).toBeVisible()
  await expect(page.getByLabel('Senha mestra')).toHaveValue('mestra-ficticia')
  await page.getByLabel('Nova senha pessoal').fill('curta')
  await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  await expect(page.getByText('A nova senha ainda não cumpre todos os itens da lista.')).toBeVisible()
  await page.getByLabel('Nova senha pessoal').fill('Pessoal2026')
  await page.getByLabel('Repita a nova senha').fill('Pessoal2026')
  await expect(page.getByText('✓ As duas digitações iguais')).toBeVisible()
  await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  await expect(page).toHaveURL(/\/seu-dia$/)
  expect(est.funcao.find((x) => x.equipeNovaSenha)).toEqual({ equipeNovaSenha: true, email: 'ana@silvaprado.exemplo.br', mestra: 'mestra-ficticia', nova: 'Pessoal2026' })
})

test('esqueci a senha abre o mesmo caminho pela senha mestra', async ({ page }) => {
  await simularSupabase(page, {})
  await abrirLogin(page)
  await page.getByRole('button', { name: 'Primeiro acesso ou esqueci a senha' }).click()
  await expect(page.getByLabel('Senha mestra')).toHaveValue('')
  await page.getByRole('button', { name: 'Voltar para entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar no HiAdv' })).toBeVisible()
})

test('se o servidor da equipe estiver fora, ainda tenta entrar direto', async ({ page }) => {
  await simularSupabase(page, { loginEquipe: 'fora' })
  await abrirLogin(page)
  await page.getByLabel('E-mail').fill('ana@silvaprado.exemplo.br')
  await page.getByLabel('Senha').fill('certa')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/seu-dia$/)
})

test('a entrada apresenta o HiAdv e o login estático bate com o do app', async ({ page, request }) => {
  const html = await (await request.get('/login')).text()
  expect(html).toContain('<p class="login-chamada">Seus processos, prazos e peças sob controle.</p>')
  await simularSupabase(page, {})
  await page.goto('/login')
  await page.locator('[data-estatico]').waitFor({ state: 'detached' })
  const sobre = page.getByRole('complementary', { name: 'Sobre o HiAdv' })
  await expect(sobre.getByText('Seus processos, prazos e peças sob controle.')).toBeVisible()
  await expect(sobre.getByText(/construindo o próprio escritório/)).toBeVisible()
})
