import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const clientes = [{ id: 'c1', nome: 'Bruno Teixeira', telefone: '49999110002', origem: 'whatsapp', criado_em: '2026-09-10T12:00:00Z' }]

test('advogada trabalhista abre um caso cível: a área é ligada junto com o caso', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes, areas: [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }] })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/clientes/c1')
  await page.getByRole('button', { name: 'Novo caso' }).click()
  const d = page.getByRole('dialog', { name: 'Novo caso' })
  await d.getByLabel('Área').selectOption('civel')
  await expect(d.getByText('Ao abrir o caso, a área Cível é ligada no escritório e ganha quadro próprio.')).toBeVisible()
  await d.getByRole('button', { name: 'Abrir caso' }).click()
  await expect(d).toBeHidden()
  const nomes = estado.rpcs.map((x) => x.nome)
  expect(nomes.indexOf('area_ativar')).toBeLessThan(nomes.indexOf('hiadv_caso_criar'))
  expect(estado.rpcs.find((x) => x.nome === 'area_ativar')?.corpo).toEqual({ p_area: 'civel', p_ativa: true })
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_caso_criar')?.corpo).toMatchObject({ p_area: 'civel', p_produto: null })
})

test('colaborador não liga áreas: vê só as do escritório e a orientação', async ({ page }) => {
  await simularSupabase(page, { clientes, papel: 'colaborador' })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/clientes/c1')
  await page.getByRole('button', { name: 'Novo caso' }).click()
  const d = page.getByRole('dialog', { name: 'Novo caso' })
  await expect(d.locator('option', { hasText: '(ligar)' })).toHaveCount(0)
  await expect(d.getByText('Peça ao Gestor para ligar a área em Configurações.')).toBeVisible()
})

test('configurações: liga o bancário e desliga com confirmação, sem apagar nada', async ({ page }) => {
  const estado = await simularSupabase(page, { areas: [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }] })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/configuracoes')
  await page.getByRole('button', { name: 'Ligar Bancário' }).click()
  await expect(page.getByText('Bancário ligada. Ela já aparece no menu e no "Novo caso".')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Desligar Bancário' })).toBeVisible()
  await page.getByRole('button', { name: 'Desligar Bancário' }).click()
  const d = page.getByRole('dialog', { name: 'Desligar Bancário?' })
  await expect(d.getByText('Nada é apagado')).toBeVisible()
  await d.getByRole('button', { name: 'Desligar' }).click()
  await expect(page.getByRole('button', { name: 'Ligar Bancário' })).toBeVisible()
  expect(estado.rpcs.filter((x) => x.nome === 'area_ativar').map((x) => x.corpo)).toEqual([{ p_area: 'bancario', p_ativa: true }, { p_area: 'bancario', p_ativa: false }])
})

test('celular: a página de áreas tem "Novo caso" e o atalho para ligar outra área', async ({ page }, info) => {
  test.skip(info.project.name === 'computador', 'só no celular')
  await simularSupabase(page, { clientes })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/areas')
  await expect(page.getByRole('button', { name: 'Novo caso' })).toBeVisible()
  await page.getByRole('link', { name: /Ligar outra área/ }).click()
  await expect(page).toHaveURL(/\/configuracoes#areas-de-atuacao$/)
  await expect(page.getByRole('heading', { name: 'Áreas de atuação' })).toBeInViewport()
})
