import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const etapas = [{ status: 'pendente', ordem: 1, final: false, pede_motivo: false }, { status: 'protocolado', ordem: 5, final: false, pede_motivo: false }]
const casos = [{ id: 'k1', cliente: 'Bruno Teixeira', status: 'pendente', dias: 3, produto: 'Reclamação trabalhista', gate_ok: 1, gate_total: 2 }]
const camposArea = [
  { chave: 'reclamadas', rotulo: 'Reclamada(s)', tipo: 'texto', opcoes: null, ordem: 10, no_cartao: true },
  { chave: 'salario', rotulo: 'Último salário', tipo: 'moeda', opcoes: null, ordem: 50, no_cartao: false },
  { chave: 'fase', rotulo: 'Fase', tipo: 'lista', opcoes: ['Conhecimento', 'Recurso'], ordem: 120, no_cartao: true },
]
const detalhe = {
  caso: { id: 'k1', via: 'trabalhista', status: 'pendente', produto: 'Reclamação trabalhista', cliente: 'Bruno Teixeira', campos: { reclamadas: 'Metalúrgica Alfa Ltda.', salario: 3150 } },
  checklist: [{ item: 'procuracao', rotulo: 'Procuração assinada', data: '2026-11-01' }, { item: 'ctps', rotulo: 'CTPS digital', data: null }],
  historico: [{ evento: 'status', de: null, para: 'pendente', detalhe: null, quem: 'ana@silvaprado.exemplo.br', em: '2026-11-18T13:00:00Z' }],
  pericias: [], status: etapas,
}

async function abrirFicha(page: import('@playwright/test').Page) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/area/trabalhista')
  await page.getByRole('button', { name: 'Bruno Teixeira' }).click()
  return page.getByRole('dialog', { name: 'Bruno Teixeira' })
}

test('ficha mostra campos da área, checklist e histórico', async ({ page }) => {
  await simularSupabase(page, { etapas, casos, detalhe, camposArea })
  const f = await abrirFicha(page)
  await expect(f.getByText('Metalúrgica Alfa Ltda.')).toBeVisible()
  await expect(f.getByText('R$ 3.150,00')).toBeVisible()
  await expect(f.getByText('1 de 2')).toBeVisible()
  await expect(f.getByText('Entrou em “pendente”')).toBeVisible()
})

test('editar manda só o que mudou e confere o valor antes', async ({ page }) => {
  const est = await simularSupabase(page, { etapas, casos, detalhe, camposArea })
  const f = await abrirFicha(page)
  await f.getByRole('button', { name: 'Editar' }).click()
  await f.getByLabel('Último salário').fill('abc')
  await f.getByRole('button', { name: 'Salvar campos' }).click()
  await expect(f.getByText('Informe um valor em reais em "Último salário".')).toBeVisible()
  expect(est.salvos).toHaveLength(0)
  await f.getByLabel('Último salário').fill('3.200,50')
  await f.getByLabel('Fase').selectOption('Recurso')
  await f.getByRole('button', { name: 'Salvar campos' }).click()
  await expect(page.getByText('2 campos salvos.')).toBeVisible()
  expect(est.salvos[0]).toEqual({ p_caso: 'k1', p_campos: { salario: '3200.50', fase: 'Recurso' } })
})

test('recusa do servidor aparece e mantém a edição aberta', async ({ page }) => {
  await simularSupabase(page, { etapas, casos, detalhe, camposArea, recusarCampos: 'Valor não permitido em "Fase".' })
  const f = await abrirFicha(page)
  await f.getByRole('button', { name: 'Editar' }).click()
  await f.getByLabel('Fase').selectOption('Recurso')
  await f.getByRole('button', { name: 'Salvar campos' }).click()
  await expect(page.getByText('Não foi possível salvar: Valor não permitido em "Fase".')).toBeVisible()
  await expect(f.getByRole('button', { name: 'Salvar campos' })).toBeVisible()
})
