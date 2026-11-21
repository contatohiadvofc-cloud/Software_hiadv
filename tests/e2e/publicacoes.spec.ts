import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const hoje = new Date().toISOString().slice(0, 10)
const publicacoes = [
  { id: 1, data_hora: `${hoje}T13:00:00Z`, publicacao: true, titulo: 'Intimação', texto: 'Fica a parte autora intimada para, no prazo de 15 (quinze) dias, manifestar-se sobre o laudo pericial.', processo_id: 'p1', numero_cnj: '50012345620264047212', cliente_id: 'c1', cliente: 'Rita Moura', tarefa_id: null, tarefa_prazo: null, tarefa_status: null },
  { id: 2, data_hora: `${hoje}T12:00:00Z`, publicacao: false, titulo: 'Juntada de laudo pericial', texto: null, processo_id: 'p1', numero_cnj: '50012345620264047212', cliente_id: 'c1', cliente: 'Rita Moura', tarefa_id: null, tarefa_prazo: null, tarefa_status: null },
  { id: 3, data_hora: `${hoje}T11:00:00Z`, publicacao: true, titulo: 'Sentença', texto: 'Julgo procedente.', processo_id: 'p3', numero_cnj: null, cliente_id: 'c3', cliente: 'José Lima', tarefa_id: 't9', tarefa_prazo: '2026-12-01', tarefa_status: 'aberta' },
]

async function abrir(page: import('@playwright/test').Page, rota: string) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto(rota)
}

test('publicações: lista o dia, mostra a tarefa gerada e alterna para andamentos', async ({ page }) => {
  await simularSupabase(page, { publicacoes, oabs: ['OAB/SC 30.297'] })
  await abrir(page, '/publicacoes')
  await expect(page.getByRole('heading', { name: 'Publicações', level: 1 })).toBeVisible()
  await expect(page.getByText('5001234-56.2026.4.04.7212')).toBeVisible()
  await expect(page.getByText('Virou tarefa · prazo 01/12/2026')).toBeVisible()
  await expect(page.getByText('Juntada de laudo pericial')).toHaveCount(0)
  await page.getByRole('button', { name: 'Tudo (com andamentos)' }).click()
  await expect(page.getByText('Juntada de laudo pericial')).toBeVisible()
  await expect(page.getByText('Acompanhando: OAB/SC 30.297.', { exact: false })).toBeVisible()
})

test('publicação vira tarefa com o prazo calculado (dias da publicação já preenchidos)', async ({ page }) => {
  const estado = await simularSupabase(page, { publicacoes, oabs: ['OAB/SC 30.297'] })
  await abrir(page, '/publicacoes')
  await page.getByRole('button', { name: 'Calcular prazo e criar tarefa' }).click()
  const d = page.getByRole('dialog', { name: 'Calcular prazo' })
  await expect(d.getByLabel('Prazo (dias)')).toHaveValue('15')
  await d.getByRole('button', { name: 'Calcular' }).click()
  await expect(d.getByText('Último dia:')).toContainText('15/12/2026')
  await d.getByText('Dias que não contaram (1)').click()
  await expect(d.getByText('08/12/2026: Dia da Justiça')).toBeVisible()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_prazo')?.corpo).toMatchObject({ p_dias: 15, p_contagem: 'uteis', p_disponibilizacao: true })
  await expect(d.getByLabel('O que precisa ser feito')).toHaveValue('Intimação · Rita Moura')
  await d.getByRole('button', { name: 'Criar tarefa com prazo em 15/12/2026' }).click()
  await expect(d).toBeHidden()
  expect(estado.tarefasCriadas.at(-1)).toMatchObject({ p_prazo: '2026-12-15', p_processo: 'p1', p_titulo: 'Intimação · Rita Moura' })
})

test('sem OAB cadastrada, o gestor é levado a cadastrar; OAB é normalizada e salva', async ({ page }) => {
  const estado = await simularSupabase(page, { publicacoes: [], oabs: [] })
  await abrir(page, '/publicacoes')
  await expect(page.getByText('Nenhuma OAB acompanhada ainda.')).toBeVisible()
  await page.getByRole('link', { name: 'Configurações › OABs acompanhadas' }).click()
  await page.getByLabel('Adicionar OAB').fill('30297/sc')
  await page.getByRole('button', { name: 'Adicionar' }).click()
  await expect(page.getByText('OAB/SC 30.297')).toBeVisible()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_oabs_salvar')?.corpo).toEqual({ p_oabs: ['OAB/SC 30.297'] })
  await page.getByLabel('Adicionar OAB').fill('abc')
  await page.getByRole('button', { name: 'Adicionar' }).click()
  await expect(page.getByText('Não entendi a OAB.', { exact: false })).toBeVisible()
})

test('calculadora também está em Tarefas', async ({ page }) => {
  await simularSupabase(page)
  await abrir(page, '/tarefas')
  await page.getByRole('button', { name: 'Calcular prazo' }).click()
  await expect(page.getByRole('dialog', { name: 'Calcular prazo' })).toBeVisible()
})

test('publicações e calculadora sem violações sérias de acessibilidade', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await simularSupabase(page, { publicacoes, oabs: ['OAB/SC 30.297'] })
  await abrir(page, '/publicacoes')
  await expect(page.getByText('Rita Moura').first()).toBeVisible()
  let r = await new AxeBuilder({ page }).include('main').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
  await page.getByRole('button', { name: 'Calcular prazo e criar tarefa' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Calcular' }).click()
  await expect(page.getByText('Último dia:')).toBeVisible()
  r = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})
