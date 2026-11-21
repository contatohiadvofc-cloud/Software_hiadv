import { test, expect, type Page } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

async function ir(page: Page) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/configuracoes')
}

test('recursos: gestor vê o que está ligado, o passo a passo do que está em preparação e a pendência da OAB', async ({ page }) => {
  await simularSupabase(page, { oabs: [], integracoes: [{ servico: 'claude', ativo: true, tem_chave: true, chave_final: 'abcd' }] })
  await ir(page)
  const painel = page.getByRole('region', { name: 'Recursos do HiAdv' })
  await expect(painel.getByRole('link', { name: 'Abrir Atendimentos' })).toBeHidden()
  await painel.getByText(/12 recursos, sem custo/).click()
  await expect(painel.getByRole('link', { name: 'Abrir Atendimentos' })).toBeVisible()
  await expect(painel.getByRole('link', { name: 'Cadastre a OAB para começar' })).toHaveAttribute('href', '#oabs')
  const zap = painel.locator('summary', { hasText: 'Assinatura digital (ZapSign)' })
  await expect(painel.getByText('Em Configurações, Integração, API, copie o token de produção.')).toBeHidden()
  await zap.click()
  await expect(painel.getByText('Em Configurações, Integração, API, copie o token de produção.')).toBeVisible()
  await expect(painel.getByText('WhatsApp oficial com robô de triagem')).toBeVisible()
  await expect(painel.locator('summary', { hasText: 'IA dos agentes' }).getByText('Chave guardada')).toBeVisible()
  await expect(painel.getByText('Para ativar')).toHaveCount(0)
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  const r = await new AxeBuilder({ page }).include('#recursos').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})

test('recursos: colaborador vê só o que usa, sem itens de gestor', async ({ page }) => {
  await simularSupabase(page, { papel: 'colaborador' })
  await ir(page)
  const painel = page.getByRole('region', { name: 'Recursos do HiAdv' })
  await painel.getByText(/recursos, sem custo/).click()
  await expect(painel.getByRole('link', { name: 'Abrir Atendimentos' })).toBeVisible()
  await expect(painel.getByText('Financeiro e honorários')).toHaveCount(0)
  await expect(painel.getByText('IA dos agentes (Claude)')).toHaveCount(0)
  await expect(painel.getByText('Para ativar')).toHaveCount(0)
})
