import { test, expect } from '@playwright/test'

test('experimentar entra no escritório fictício com a faixa da prévia', async ({ page }) => {
  await page.goto('/experimentar')
  await expect(page).toHaveURL(/\/seu-dia/)
  const barra = page.getByRole('region', { name: 'Prévia do HiAdv' })
  await expect(barra).toContainText('Nada é salvo')
  await barra.getByRole('button', { name: /Roteiro/ }).click()
  await barra.getByRole('button', { name: /Financeiro/ }).click()
  await expect(page).toHaveURL(/\/financeiro/)
})
