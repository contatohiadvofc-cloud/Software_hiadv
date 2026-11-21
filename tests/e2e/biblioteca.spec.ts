import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const biblioteca = [
  { id: 'b1', tipo: 'modelo', titulo: 'Inicial de auxílio-acidente', area: 'trabalhista', peca: 'Petição inicial', conteudo: 'x', link: null, arquivo: null, arquivo_nome: 'inicial.docx', tamanho: 48000, criado_por: 'a', criado_em: '2026-11-10T12:00:00Z' },
  { id: 'b2', tipo: 'jurisprudencia', titulo: 'Precedente exemplo', area: null, peca: null, conteudo: 'ementa', link: 'https://exemplo.br/p', arquivo: null, arquivo_nome: null, tamanho: null, criado_por: 'a', criado_em: '2026-11-10T12:00:00Z' },
]

test('biblioteca: lista por tipo, confere e inclui item com arquivo na pasta do escritório', async ({ page }) => {
  const est = await simularSupabase(page, { biblioteca })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/biblioteca')
  await expect(page.getByText('Inicial de auxílio-acidente')).toBeVisible()
  await expect(page.getByText('Precedente exemplo')).toBeHidden()
  await page.getByRole('tab', { name: /Jurisprudência/ }).click()
  await expect(page.getByText('Precedente exemplo')).toBeVisible()

  await page.getByRole('button', { name: 'Incluir' }).click()
  const d = page.getByRole('dialog', { name: 'Incluir na Biblioteca' })
  await d.getByRole('button', { name: 'Salvar' }).click()
  await expect(d.getByText('Dê um título.')).toBeVisible()
  await d.getByLabel('Tipo').selectOption('modelo')
  await d.getByLabel('Título').fill('Quesitos de auxílio-acidente')
  await d.getByLabel(/^Arquivo/).setInputFiles({ name: 'Quesitos (versão 2).docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('teste') })
  await d.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Incluído na Biblioteca.')).toBeVisible()
  expect(est.uploads[0]).toMatch(/^esc-1\/[0-9a-f-]{36}-Quesitos_versao_2_\.docx$/)
  const salvo = est.rpcs.find((x) => x.nome === 'biblioteca_salvar')!.corpo as { p_id: null; p: Record<string, unknown> }
  expect(salvo.p).toMatchObject({ tipo: 'modelo', titulo: 'Quesitos de auxílio-acidente', arquivo_nome: 'Quesitos (versão 2).docx' })
  expect(String(salvo.p.arquivo)).toMatch(/^esc-1\//)
})

test('biblioteca: arquivo de tipo não aceito é recusado antes de enviar', async ({ page }) => {
  const est = await simularSupabase(page, { biblioteca })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/biblioteca')
  await page.getByRole('button', { name: 'Incluir' }).click()
  const d = page.getByRole('dialog', { name: 'Incluir na Biblioteca' })
  await d.getByLabel('Título').fill('Programa')
  await d.getByLabel(/^Arquivo/).setInputFiles({ name: 'programa.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') })
  await d.getByRole('button', { name: 'Salvar' }).click()
  await expect(d.getByText('Envie Word, PDF, ODT, RTF ou texto.')).toBeVisible()
  expect(est.uploads).toHaveLength(0)
})

const pacotes = [
  { slug: 'previdenciario', nome: 'Previdenciário', descricao: 'Roteiros previdenciários.', areas: ['judicial'], itens: 14, adicionados: 0, titulos: ['Petição inicial de auxílio-acidente', 'Quesitos médicos de auxílio-acidente'] },
  { slug: 'trabalhista', nome: 'Trabalhista', descricao: 'Roteiros trabalhistas.', areas: ['trabalhista'], itens: 8, adicionados: 8, titulos: ['Recurso ordinário'] },
]

test('biblioteca: gestor adiciona um pacote de roteiros prontos', async ({ page }) => {
  const est = await simularSupabase(page, { papel: 'master', biblioteca, pacotes })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/biblioteca')
  const painel = page.getByRole('region', { name: 'Roteiros prontos do HiAdv' })
  await expect(painel.getByRole('button', { name: 'Já está na sua biblioteca' })).toBeDisabled()
  await painel.getByText('Ver a lista').first().click()
  await expect(painel.getByText('Quesitos médicos de auxílio-acidente')).toBeVisible()
  await painel.getByRole('button', { name: 'Adicionar 14 roteiros' }).click()
  await expect(page.getByText(/14 roteiros adicionados à sua biblioteca/)).toBeVisible()
  expect(est.rpcs.find((x) => x.nome === 'pacote_adicionar')?.corpo).toEqual({ p_slug: 'previdenciario' })
})

test('biblioteca: colaborador não vê os pacotes', async ({ page }) => {
  await simularSupabase(page, { papel: 'colaborador', biblioteca, pacotes })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/biblioteca')
  await expect(page.getByText('Inicial de auxílio-acidente')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Roteiros prontos do HiAdv' })).toHaveCount(0)
})
