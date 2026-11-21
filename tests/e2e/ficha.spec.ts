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
  await f.getByRole('button', { name: 'Editar dados da área' }).click()
  await f.getByLabel('Último salário').fill('abc')
  await f.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(f.getByText('Informe um valor em reais em "Último salário".')).toBeVisible()
  expect(est.salvos).toHaveLength(0)
  await f.getByLabel('Último salário').fill('3.200,50')
  await f.getByLabel('Fase').selectOption('Recurso')
  await f.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('2 campos salvos.')).toBeVisible()
  expect(est.salvos[0]).toEqual({ p_caso: 'k1', p_campos: { salario: '3200.50', fase: 'Recurso' } })
})

test('recusa do servidor aparece e mantém a edição aberta', async ({ page }) => {
  await simularSupabase(page, { etapas, casos, detalhe, camposArea, recusarCampos: 'Valor não permitido em "Fase".' })
  const f = await abrirFicha(page)
  await f.getByRole('button', { name: 'Editar dados da área' }).click()
  await f.getByLabel('Fase').selectOption('Recurso')
  await f.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Não foi possível salvar: Valor não permitido em "Fase".')).toBeVisible()
  await expect(f.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible()
})

test('cartão mostra os campos marcados para o quadro', async ({ page }) => {
  await simularSupabase(page, { etapas, casos, detalhe, camposArea: camposArea.filter((c) => c.no_cartao), camposCasos: [{ id: 'k1', campos: { reclamadas: 'Metalúrgica Alfa Ltda.', fase: 'Conhecimento', salario: 3150 } }] })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/area/trabalhista')
  const cartao = page.locator('.cartao', { hasText: 'Bruno Teixeira' })
  await expect(cartao).toContainText('Reclamada(s)Metalúrgica Alfa Ltda.')
  await expect(cartao).toContainText('FaseConhecimento')
  await expect(cartao).not.toContainText('3.150')
})

const detalhePrev = {
  caso: { id: 'k9', via: 'judicial', status: 'pendente', produto: 'Auxílio-acidente', cliente: 'Rita Moura', campos: {}, nb: '712.345.678-9', dib: null, sequela: 'Limitação do punho' },
  checklist: [{ item: 'procuracao', rotulo: 'Procuração assinada', data: null }],
  historico: [], pericias: [], status: etapas,
}
const casosPrev = [{ id: 'k9', cliente: 'Rita Moura', status: 'pendente', dias: 1, produto: 'Auxílio-acidente', gate_ok: 0, gate_total: 1 }]

test('previdenciário: dados do benefício editáveis e checklist com data do documento', async ({ page }) => {
  const est = await simularSupabase(page, { etapas, casos: casosPrev, detalhe: detalhePrev, camposArea: [], areas: [{ area: 'judicial', nome: 'Previdenciário judicial', ordem: 1 }] })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/area/judicial')
  await page.getByRole('button', { name: 'Rita Moura' }).click()
  const f = page.getByRole('dialog', { name: 'Rita Moura' })
  await expect(f.getByText('712.345.678-9')).toBeVisible()
  await expect(f.getByText('Limitação do punho')).toBeVisible()
  await expect(f.getByRole('heading', { name: 'Dados da área' })).toHaveCount(0)
  await f.getByRole('button', { name: 'Editar dados do benefício' }).click()
  await f.getByLabel('DIB').fill('2024-03-01')
  await f.getByLabel('UF').fill('sc')
  await f.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('2 campos salvos.')).toBeVisible()
  expect(est.beneficios[0]).toEqual({ p_caso: 'k9', p: { dib: '2024-03-01', uf: 'sc' } })

  await f.getByRole('button', { name: 'Marcar Procuração assinada' }).click()
  await f.getByLabel('Data do documento').fill('2026-11-10')
  await f.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Item marcado.')).toBeVisible()
  expect(est.gates[0]).toEqual({ p_caso: 'k9', p_item: 'procuracao', p_data: '2026-11-10' })
})
