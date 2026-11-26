import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const TUDO = ['casos', 'clientes', 'prazos', 'publicacoes', 'atendimentos', 'agenda', 'acompanhamento', 'documentos', 'celular', 'financeiro', 'relatorios', 'horas', 'atencao', 'drive', 'ia']
const clientes = [{ id: 'c1', nome: 'Bruno Teixeira', telefone: '49999110002', origem: 'whatsapp', criado_em: '2026-09-10T12:00:00Z' }]
const hoje = new Date().toISOString().slice(0, 10)

test('assistente de IA na página do cliente: pede a instrução da minuta e mostra o rascunho', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes, meusRecursos: { plano: 'supremo', situacao: 'ativo', recursos: TUDO }, ia: { ok: true, texto: 'MERITÍSSIMO JUÍZO … rascunho' } })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/clientes/c1')
  await page.getByRole('button', { name: 'Assistente de IA' }).click()
  const d = page.getByRole('dialog', { name: 'Assistente de IA' })
  await expect(d.getByText('Usos neste mês: 2 de 300.')).toBeVisible()
  await expect(d.getByText('O Google Drive ainda não foi configurado pelo HiAdv.')).toBeVisible()
  await d.getByLabel('O que você precisa').selectOption('minuta')
  await d.getByRole('button', { name: 'Gerar rascunho' }).click()
  await expect(d.getByRole('alert')).toHaveText('Diga qual peça você quer e o que ela precisa conter.')
  await d.getByLabel(/Instrução/).fill('Réplica à contestação do INSS.')
  await d.getByRole('button', { name: 'Gerar rascunho' }).click()
  await expect(d.getByRole('textbox', { name: 'Rascunho para revisar' })).toHaveValue('MERITÍSSIMO JUÍZO … rascunho')
  const corpo = estado.rpcs.find((x) => x.nome === 'funcao_ia')?.corpo
  expect(corpo).toMatchObject({ acao: 'minuta', instrucao: 'Réplica à contestação do INSS.', caso: { cliente: 'Bruno Teixeira' } })
})

test('erro do servidor aparece claro (ex.: chave não cadastrada)', async ({ page }) => {
  await simularSupabase(page, { clientes, meusRecursos: { plano: 'supremo', situacao: 'ativo', recursos: TUDO }, ia: { ok: false, erro: 'A IA ainda não está ligada. O Gestor cadastra a chave da Claude em Configurações, Integrações.' } })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/clientes/c1')
  await page.getByRole('button', { name: 'Assistente de IA' }).click()
  const d = page.getByRole('dialog', { name: 'Assistente de IA' })
  await d.getByRole('button', { name: 'Gerar rascunho' }).click()
  await expect(d.getByRole('alert')).toContainText('A IA ainda não está ligada')
})

test('sem o plano Sênior o botão de IA não aparece', async ({ page }) => {
  await simularSupabase(page, { clientes, meusRecursos: { plano: 'premium', situacao: 'ativo', recursos: TUDO.filter((r) => r !== 'ia') } })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/clientes/c1')
  await expect(page.getByRole('heading', { name: 'Bruno Teixeira' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Assistente de IA' })).toHaveCount(0)
})

test('publicação: Resumir com IA já leva o texto da intimação', async ({ page }) => {
  const estado = await simularSupabase(page, {
    meusRecursos: { plano: 'supremo', situacao: 'ativo', recursos: TUDO },
    publicacoes: [{ id: 1, data_hora: `${hoje}T13:00:00Z`, publicacao: true, titulo: 'Intimação', texto: 'Fica a parte autora intimada para manifestar-se sobre o laudo.', processo_id: 'p1', numero_cnj: '50012345620264047212', cliente_id: 'c1', cliente: 'Rita Moura', tarefa_id: null, tarefa_prazo: null, tarefa_status: null }],
  })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/publicacoes')
  await page.getByRole('button', { name: 'Resumir com IA' }).click()
  const d = page.getByRole('dialog', { name: 'Assistente de IA' })
  await expect(d.getByLabel('O que você precisa')).toHaveValue('resumo_intimacao')
  await d.getByRole('button', { name: 'Gerar rascunho' }).click()
  await expect(d.getByRole('textbox', { name: 'Rascunho para revisar' })).toHaveValue('Rascunho de teste.')
  expect(estado.rpcs.find((x) => x.nome === 'funcao_ia')?.corpo).toMatchObject({ acao: 'resumo_intimacao', texto: expect.stringContaining('manifestar-se sobre o laudo') })
})
