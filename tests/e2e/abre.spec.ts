import { test, expect } from '@playwright/test'

test('a página abre com o título HiAdv', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/HiAdv/)
})
