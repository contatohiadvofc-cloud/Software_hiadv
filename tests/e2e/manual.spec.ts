import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

test('manual: aberto pelas configurações, com tela explicada, legenda e busca', async ({ page }) => {
  await simularSupabase(page, { papel: 'colaborador' })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/configuracoes')
  await page.getByRole('link', { name: 'Abrir o manual' }).click()
  await expect(page.getByRole('heading', { name: 'Manual do HiAdv' })).toBeVisible()
  const casos = page.getByRole('region', { name: 'Casos por área' })
  await expect(casos.locator('img')).toHaveAttribute('src', '/manual/casos.jpg')
  await expect(casos.getByText('Mover para outra etapa.')).toBeVisible()
  await expect(casos.locator('.man-bola')).toHaveCount(4)
  await expect(page.getByRole('region', { name: 'Central do HiAdv (Coder)' })).toHaveCount(0)
  await page.getByLabel('Procurar no manual').fill('publicações')
  await expect(page.getByRole('region', { name: 'Publicações e intimações' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Financeiro' })).toHaveCount(0)
})
