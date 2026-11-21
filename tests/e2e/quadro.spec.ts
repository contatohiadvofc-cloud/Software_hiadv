import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const etapas = [
  { status: 'pendente', ordem: 1, final: false, pede_motivo: false },
  { status: 'protocolado', ordem: 5, final: false, pede_motivo: false },
  { status: 'improcedente', ordem: 9, final: true, pede_motivo: true },
]
const casos = [
  { id: 'k1', cliente: 'Bruno Teixeira', status: 'pendente', dias: 18, produto: 'Reclamação trabalhista', gate_ok: 2, gate_total: 5 },
  { id: 'k2', cliente: 'Carla Mendes', status: 'protocolado', dias: 2, produto: 'Reclamação trabalhista', gate_ok: 5, gate_total: 5 },
]

/** No celular o quadro mostra uma etapa por vez: toca na aba antes de agir no cartão. */
async function irParaEtapa(page: import('@playwright/test').Page, nome: RegExp) {
  await page.locator('.quadro').waitFor({ state: 'attached' })
  const aba = page.getByRole('tab', { name: nome })
  if (await aba.isVisible()) await aba.click()
}

async function abrirArea(page: import('@playwright/test').Page) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/area/trabalhista')
}

test('quadro mostra as etapas sem as de encerramento e os cartões', async ({ page }, info) => {
  test.skip(info.project.name === 'celular', 'no celular as etapas viram abas (teste próprio abaixo)')
  await simularSupabase(page, { etapas, casos })
  await abrirArea(page)
  const quadro = page.getByRole('region', { name: 'Quadro de casos' })
  await expect(quadro.getByRole('heading', { level: 2 })).toHaveText([/Pendente/, /Protocolado/])
  await expect(quadro.getByText('18 dias na etapa')).toBeVisible()
  await page.getByLabel('Mostrar encerrados').check()
  await expect(quadro.getByRole('heading', { level: 2 })).toHaveCount(3)
})

test('mover para etapa comum chama o servidor e confirma', async ({ page }) => {
  const est = await simularSupabase(page, { etapas, casos })
  await abrirArea(page)
  await page.getByLabel('Mover Bruno Teixeira para').selectOption('protocolado')
  await expect(page.getByText('Caso movido para “Protocolado”.')).toBeVisible()
  expect(est.movidos[0]).toMatchObject({ p_caso: 'k1', p_status: 'protocolado' })
})

test('encerrar pede motivo e confirmação antes de enviar', async ({ page }) => {
  const est = await simularSupabase(page, { etapas, casos })
  await abrirArea(page)
  await irParaEtapa(page, /Protocolado/)
  await page.getByLabel('Mover Carla Mendes para').selectOption('improcedente')
  const dlg = page.getByRole('dialog')
  await expect(dlg).toContainText('etapa de encerramento')
  await expect(dlg.getByRole('button', { name: 'Confirmar' })).toBeDisabled()
  expect(est.movidos).toHaveLength(0)
  await dlg.getByLabel('Motivo (obrigatório)').fill('Sentença improcedente, sem recurso')
  await dlg.getByRole('button', { name: 'Confirmar' }).click()
  await expect.poll(() => est.movidos.length).toBe(1)
  expect(est.movidos[0]).toMatchObject({ p_status: 'improcedente', p_motivo: 'Sentença improcedente, sem recurso' })
})

test('servidor recusa: o cartão volta para a etapa e aparece o motivo', async ({ page }) => {
  await simularSupabase(page, { etapas, casos, recusarMover: true })
  await abrirArea(page)
  await page.getByLabel('Mover Bruno Teixeira para').selectOption('protocolado')
  await expect(page.getByText(/Não foi possível mover: Só o jurídico/)).toBeVisible()
  await expect(page.locator('section.coluna').first().locator('.cartao-nome', { hasText: 'Bruno Teixeira' })).toBeVisible()
})

test('celular: abas de etapa com contagem, uma etapa por vez', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'só no celular')
  const vazia = [{ status: 'triagem', ordem: 0, final: false, pede_motivo: false }, ...etapas]
  await simularSupabase(page, { etapas: vazia, casos })
  await abrirArea(page)
  await expect(page.getByRole('tab')).toHaveText([/Triagem\s*0/, /Pendente\s*1/, /Protocolado\s*1/])
  // abre na primeira etapa que tem casos, não na vazia
  await expect(page.getByRole('tab', { name: /Pendente/ })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Bruno Teixeira' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Carla Mendes' })).toBeHidden()
  await page.getByRole('tab', { name: /Triagem/ }).click()
  await expect(page.getByText('Nenhum caso nesta etapa.')).toBeVisible()
  await page.getByRole('tab', { name: /Protocolado/ }).click()
  await expect(page.getByRole('button', { name: 'Carla Mendes' })).toBeVisible()
})
