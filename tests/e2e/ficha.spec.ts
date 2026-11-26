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
  await f.getByLabel('UF').selectOption('SC')
  await f.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('2 campos salvos.')).toBeVisible()
  expect(est.beneficios[0]).toEqual({ p_caso: 'k9', p: { dib: '2024-03-01', uf: 'SC' } })

  await f.getByRole('button', { name: 'Marcar Procuração assinada' }).click()
  await f.getByLabel('Data do documento').fill('2026-11-10')
  await f.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Item marcado.')).toBeVisible()
  expect(est.gates[0]).toEqual({ p_caso: 'k9', p_item: 'procuracao', p_data: '2026-11-10' })
})

test('relato do cliente: escreve e salva no caso', async ({ page }) => {
  const est = await simularSupabase(page, { etapas, casos, detalhe, camposArea })
  const f = await abrirFicha(page)
  await expect(f.getByText(/Conte aqui, com as palavras do cliente/)).toBeVisible()
  await f.getByRole('button', { name: 'Escrever relato' }).click()
  await f.getByRole('textbox', { name: 'Relato do cliente' }).fill('Foi dispensado sem receber as verbas rescisórias.')
  await f.getByRole('button', { name: 'Salvar relato' }).click()
  await expect(page.getByText('Relato salvo.')).toBeVisible()
  expect(est.rpcs.find((x) => x.nome === 'caso_relato_salvar')!.corpo).toEqual({ p_caso: 'k1', p_relato: 'Foi dispensado sem receber as verbas rescisórias.' })
})

test('andamento: registrar protocolo confere a data e manda número e data', async ({ page }) => {
  const est = await simularSupabase(page, { etapas, casos, detalhe, camposArea })
  const f = await abrirFicha(page)
  await expect(f.getByText('Sem protocolo registrado.')).toBeVisible()
  await f.getByRole('button', { name: 'Registrar protocolo' }).click()
  await f.getByLabel('Número do protocolo').fill('')
  await f.getByRole('button', { name: 'Confirmar' }).click()
  await expect(f.getByRole('alert')).toContainText('número')
  await f.getByLabel('Número do protocolo').fill('ATOrd 0001234')
  await f.getByLabel('Data do protocolo').fill('2026-11-20')
  await f.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Protocolo registrado. O caso foi para Protocolado.')).toBeVisible()
  expect(est.rpcs.find((x) => x.nome === 'caso_protocolar')?.corpo).toEqual({ p_caso: 'k1', p_numero: 'ATOrd 0001234', p_data: '2026-11-20' })
})

test('andamento: exigência cria a tarefa com folga e mostra o prazo interno', async ({ page }) => {
  const est = await simularSupabase(page, { etapas, casos, detalhe, camposArea })
  const f = await abrirFicha(page)
  await f.getByRole('button', { name: 'Registrar exigência' }).click()
  await f.getByLabel('O que foi exigido').fill('Juntar comprovante de endereço atualizado.')
  await f.getByLabel('Prazo fatal').fill('2099-12-01')
  await expect(f.getByText(/Prazo interno previsto: 27\/11\/2099/)).toBeVisible()
  await f.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText(/Exigência registrada\. Tarefa criada com prazo interno 27\/11\/2026/)).toBeVisible()
  const corpo = est.rpcs.find((x) => x.nome === 'caso_exigencia')?.corpo
  expect(corpo).toMatchObject({ p_caso: 'k1', p_prazo_fatal: '2099-12-01', p_folga: 2 })
})

test('andamento: mudar de via abre o caso novo ligado ao de origem', async ({ page }) => {
  const est = await simularSupabase(page, {
    etapas, casos, detalhe, camposArea,
    areas: [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }, { area: 'civel', nome: 'Cível', ordem: 20 }],
  })
  const f = await abrirFicha(page)
  await f.getByRole('button', { name: 'Mudar de via' }).click()
  await expect(f.getByLabel('Nova via')).toHaveValue('civel')
  await f.getByLabel('Motivo (opcional)').fill('Cobrança de verbas fora da CLT')
  await f.getByRole('button', { name: 'Abrir caso na nova via' }).click()
  await expect(page.getByText('Caso aberto em Cível. O caso de origem continua onde está.')).toBeVisible()
  expect(est.rpcs.find((x) => x.nome === 'caso_mudar_via')?.corpo).toEqual({ p_caso: 'k1', p_via: 'civel', p_motivo: 'Cobrança de verbas fora da CLT' })
})

test('andamento: sem outra via ativa, não oferece mudar de via', async ({ page }) => {
  await simularSupabase(page, { etapas, casos, detalhe, camposArea })
  const f = await abrirFicha(page)
  await expect(f.getByRole('button', { name: 'Registrar exigência' })).toBeVisible()
  await expect(f.getByRole('button', { name: 'Mudar de via' })).toHaveCount(0)
})
