import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

test('botão Voltar no topo: volta à tela anterior e, sem histórico, vai para Seu dia', async ({ page }) => {
  await simularSupabase(page, {})
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await expect(page.getByRole('button', { name: 'Voltar para a tela anterior' })).toHaveCount(0)
  await page.goto('/seu-dia')
  await page.getByRole('link', { name: 'Clientes' }).first().click()
  await expect(page).toHaveURL(/\/clientes$/)
  await page.getByRole('button', { name: 'Voltar para a tela anterior' }).click()
  await expect(page).toHaveURL(/\/seu-dia$/)
})
