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

test('prévia: contatos — cadastra número externo e mostra WhatsApp', async ({ page }) => {
  await page.goto('/experimentar')
  await page.getByRole('link', { name: /^Conversas/ }).first().click()
  await page.getByRole('tab', { name: 'Contatos' }).click()
  await page.getByRole('button', { name: 'Novo contato externo' }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Agência INSS Teste')
  await page.getByLabel('Número').fill('(49) 98888-7777')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5549988887777')
})

test('prévia: busca no que foi dito e ajustes de som', async ({ page }) => {
  await page.goto('/experimentar')
  await page.getByRole('link', { name: /^Conversas/ }).first().click()
  await page.getByRole('textbox', { name: 'Buscar' }).fill('CTPS')
  await expect(page.getByText(/Mensagens e áudios com/)).toBeVisible()
  await expect(page.locator('.cv-achado').first()).toContainText('CTPS')
  await page.getByRole('button', { name: 'Sons e avisos' }).click()
  await page.getByRole('button', { name: 'Sino' }).click()
  await expect(page.getByRole('button', { name: 'Sino' })).toHaveAttribute('aria-pressed', 'true')
})
