import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('hiadv-previa-ultima'))
  await page.goto('/experimentar')
  // a prévia troca da página do site para o app: espera o app abrir de vez
  await expect(page).toHaveURL(/\/seu-dia/)
  await expect(page.getByRole('button', { name: 'Modo foco' })).toBeVisible()
})

test('atalhos: ? mostra a lista e G depois C abre Conversas', async ({ page }, info) => {
  test.skip(info.project.name !== 'computador', 'teclado físico')
  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('g'); await page.keyboard.press('c')
  await expect(page).toHaveURL(/\/conversas/)
})

test('modo foco mostra só o mais urgente e sai com o botão', async ({ page }) => {
  await page.getByRole('button', { name: 'Modo foco' }).click()
  const foco = page.getByRole('dialog', { name: 'Modo foco' })
  await expect(foco).toBeVisible()
  expect(await foco.locator('.foco-item').count()).toBeLessThanOrEqual(5)
  await page.getByRole('button', { name: 'Sair do foco' }).click()
  await expect(foco).toHaveCount(0)
})

test('sem internet: aparece o aviso e some quando volta', async ({ page, context }) => {
  await context.setOffline(true)
  await expect(page.getByText(/Sem internet\. Você vê o último estado salvo/)).toBeVisible({ timeout: 10_000 })
  await context.setOffline(false)
  await expect(page.getByText('Internet de volta. Tudo sincronizado.')).toBeVisible()
})
