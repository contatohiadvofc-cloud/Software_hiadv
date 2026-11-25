import { test, expect } from '@playwright/test'

test('prévia: conversas da equipe e comunidades abrem sem estourar a tela', async ({ page }) => {
  await page.goto('/experimentar')
  await page.getByRole('link', { name: /^Conversas/ }).first().click()
  await expect(page.getByRole('tab', { name: /Equipe/ })).toBeVisible()
  const larg = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(larg).toBeLessThanOrEqual(1)
  await page.getByText(/Equipe Silva/).first().click()
  await page.getByRole('textbox').last().fill('Meta do mês: 12 protocolos')
  await page.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(page.getByText('Meta do mês: 12 protocolos', { exact: true }).last()).toBeVisible()
})
