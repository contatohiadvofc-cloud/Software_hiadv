import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const clientes = [
  { id: 'c1', nome: 'Bruno Teixeira', telefone: '49999110002', origem: 'whatsapp', criado_em: '2026-09-10T12:00:00Z' },
  { id: 'c2', nome: 'Carla Mendes', telefone: null, origem: 'site', criado_em: '2026-10-01T12:00:00Z' },
]

async function abrir(page: import('@playwright/test').Page) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/clientes')
}

test('clientes: lista, filtra pelo nome e abre a página do cliente', async ({ page }) => {
  await simularSupabase(page, {
    clientes,
    casosCliente: [{ id: 'k1', via: 'trabalhista', status: 'protocolado', produto: 'Reclamação trabalhista' }],
    processos: [{ id: 'p1', numero_cnj: '0000123-45.2026.5.12.0001', classe: 'Ação trabalhista', orgao_julgador: '2ª Vara do Trabalho', ativo: true }],
  })
  await abrir(page)
  await expect(page.getByRole('link', { name: /Bruno Teixeira/ })).toBeVisible()
  await page.getByLabel('Filtrar clientes pelo nome').fill('carla')
  await expect(page.getByRole('link', { name: /Bruno Teixeira/ })).toBeHidden()
  await expect(page.getByRole('link', { name: /Carla Mendes/ })).toBeVisible()
  await page.getByLabel('Filtrar clientes pelo nome').fill('')
  await page.getByRole('link', { name: /Bruno Teixeira/ }).click()
  await expect(page).toHaveURL(/\/clientes\/c1$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Bruno Teixeira' })).toBeVisible()
  await expect(page.getByText('(49) 99911-0002')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir no WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5549999110002')
  await expect(page.getByText('0000123-45.2026.5.12.0001')).toBeVisible()
  await expect(page.getByRole('button', { name: /Reclamação trabalhista/ })).toBeVisible()
})

test('telas novas sem violações sérias de acessibilidade', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await simularSupabase(page, { clientes, tarefas: [{ id: 't1', titulo: 'Pedir CTPS', detalhe: null, prazo: '2026-01-02', prazo_fatal: null, responsavel: 'ana@silvaprado.exemplo.br' }] })
  await abrir(page)
  for (const rota of ['/clientes', '/clientes/c1', '/tarefas', '/biblioteca', '/configuracoes']) {
    await page.goto(rota)
    await page.locator('main h1').first().waitFor()
    const r = await new AxeBuilder({ page }).analyze()
    const serias = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serias.map((v) => `${rota}: ${v.id}`)).toEqual([])
  }
})
