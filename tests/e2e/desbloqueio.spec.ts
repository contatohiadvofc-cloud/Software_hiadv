import { test, expect, type Page } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

// WebAuthn não aceita IP como domínio: estes testes usam localhost.
test.use({ baseURL: 'http://localhost:4173' })

async function autenticadorVirtual(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  })
  return { cdp, authenticatorId }
}

test('a senha pode ser vista enquanto digita', async ({ page }) => {
  await simularSupabase(page)
  await page.goto('/login')
  await page.locator('[data-estatico]').waitFor({ state: 'detached' })
  const campo = page.getByLabel('Senha', { exact: true })
  await campo.fill('minha-senha')
  await expect(campo).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Mostrar senha' }).click()
  await expect(campo).toHaveAttribute('type', 'text')
  await expect(page.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Ocultar senha' }).click()
  await expect(campo).toHaveAttribute('type', 'password')
})

test('no celular: oferece a senha do celular e depois abre com ela', async ({ page }, info) => {
  test.skip(info.project.name === 'computador', 'só no celular')
  const { cdp, authenticatorId } = await autenticadorVirtual(page)
  await simularSupabase(page)
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.getByRole('button', { name: 'Usar a senha do celular' }).click()
  await expect(page.getByText('Nas próximas vezes, abra o HiAdv com a senha do celular.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Usar a senha do celular' })).toHaveCount(0)

  // nova abertura do app: o aparelho confirma o dono antes de mostrar os dados
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await expect(page).toHaveURL(/\/seu-dia$/)
  await expect(page.locator('.topo-busca')).toBeVisible()

  // se o aparelho não confirmar, dá para voltar ao e-mail e senha
  await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false })
  await page.evaluate(() => sessionStorage.clear())
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Não foi confirmado')
  await expect(page.locator('.topo-busca')).toHaveCount(0)
  await page.getByRole('button', { name: 'Entrar com e-mail e senha' }).click()
  await expect(page).toHaveURL(/\/login/)
})

test('no celular: "Agora não" some com a oferta', async ({ page }, info) => {
  test.skip(info.project.name === 'computador', 'só no celular')
  await autenticadorVirtual(page)
  await simularSupabase(page)
  await entrar(page)
  await page.getByRole('button', { name: 'Agora não' }).click()
  await expect(page.getByRole('button', { name: 'Usar a senha do celular' })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.topo-busca')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Usar a senha do celular' })).toHaveCount(0)
})

test('no computador não aparece a oferta; colaborador vê "Este aparelho" em Configurações', async ({ page }, info) => {
  test.skip(info.project.name !== 'computador', 'só no computador')
  await simularSupabase(page, { papel: 'colaborador' })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await expect(page.getByRole('button', { name: 'Usar a senha do celular' })).toHaveCount(0)
  await page.goto('/configuracoes')
  await expect(page.getByRole('heading', { name: 'Este aparelho' })).toBeVisible()
  await expect(page.getByText('As configurações do escritório ficam com o Gestor.')).toBeVisible()
})
