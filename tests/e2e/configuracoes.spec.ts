import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const integracoes = [
  { servico: 'claude', ativo: false, modo: null, limite_mensal: null, tem_chave: false, chave_final: null, configurado_em: null },
  { servico: 'zapsign', ativo: false, modo: 'um_clique', limite_mensal: null, tem_chave: false, chave_final: null, configurado_em: null },
  { servico: 'google_drive', ativo: false, modo: null, limite_mensal: null, tem_chave: false, chave_final: null, configurado_em: null },
]
const agentes = [{ agente: 'redatora', nome: 'Redatora', descricao: 'Escreve a minuta.', areas: null, precisa: ['claude', 'relato', 'modelo'], usa_modelo: true, ativo: false, etapas: [], modelo_id: null, modelo_titulo: null }]

async function abrir(page: import('@playwright/test').Page) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/configuracoes#agentes')
}

test('integrações: chave vai ao servidor e só o final aparece; ativar exige chave', async ({ page }) => {
  const est = await simularSupabase(page, { integracoes, agentes })
  await entrar(page); await expect(page).toHaveURL(/\/seu-dia$/); await page.goto('/integracoes')
  await page.getByRole('button', { name: /^Claude/ }).click()
  const claude = page.locator('.integracao', { hasText: 'IA própria do escritório (Claude)' })
  await expect(claude.getByRole('button', { name: 'Ativar' })).toBeDisabled()
  await claude.getByRole('button', { name: 'Cadastrar chave' }).click()
  const d = page.getByRole('dialog', { name: /Chave: IA própria/ })
  await expect(d.getByLabel(/Chave da API Anthropic/)).toHaveAttribute('type', 'password')
  await d.getByLabel(/Chave da API Anthropic/).fill('sk-ant-FICTICIA-0000000000WXYZ')
  await d.getByRole('button', { name: 'Salvar chave' }).click()
  await expect(page.getByText('Chave cadastrada (final WXYZ).')).toBeVisible()
  expect(est.rpcs.find((x) => x.nome === 'integracao_chave_salvar')!.corpo).toEqual({ p_servico: 'claude', p_chave: 'sk-ant-FICTICIA-0000000000WXYZ' })
  await expect(page.getByText('sk-ant-FICTICIA-0000000000WXYZ')).toHaveCount(0)
})

test('agentes: recusa do servidor aparece; quem não é gestor não entra', async ({ page }) => {
  await simularSupabase(page, { integracoes, agentes, etapas: [{ status: 'fazendo inicial', ordem: 3, final: false, pede_motivo: false }], recusarAgente: 'Ative a Claude em Integrações antes de ligar este agente.' })
  await abrir(page)
  const r = page.locator('.agente', { hasText: 'Redatora' })
  await expect(r.getByText(/Para ligar: Ativar a Claude em Integrações · Escolher o modelo da Biblioteca/)).toBeVisible()
  await r.getByRole('button', { name: 'Configurar Redatora' }).click()
  const d = page.getByRole('dialog', { name: 'Configurar: Redatora' })
  await d.getByLabel('Fazendo inicial').check()
  await d.getByRole('button', { name: 'Salvar e ligar' }).click()
  await expect(d.getByText('Ative a Claude em Integrações antes de ligar este agente.')).toBeVisible()
})

test('colaborador vê só o próprio aparelho, não as configurações do escritório', async ({ page }) => {
  await simularSupabase(page, { papel: 'colaborador', integracoes, agentes })
  await abrir(page)
  await expect(page.getByText('As configurações do escritório ficam com o Gestor Master.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Integrações' })).toHaveCount(0)
})

test('agente sem custo: liga só com a etapa e manda os dias do acompanhamento', async ({ page }) => {
  const est = await simularSupabase(page, {
    integracoes,
    agentes: [{ agente: 'acompanhamento', nome: 'Acompanhamento', descricao: 'Agenda retorno.', areas: null, precisa: [], usa_modelo: false, sem_custo: true, ativo: false, etapas: [], modelo_id: null, modelo_titulo: null, parametros: {} }],
    etapas: [{ status: 'protocolado', ordem: 5, final: false, pede_motivo: false }],
  })
  await abrir(page)
  const r = page.locator('.agente', { hasText: 'Acompanhamento' })
  await expect(r.getByText('Sem custo · funciona sem chave')).toBeVisible()
  await expect(r.getByText('Para ligar: Escolher em quais etapas entra')).toBeVisible()
  await r.getByRole('button', { name: 'Configurar Acompanhamento' }).click()
  const d = page.getByRole('dialog', { name: 'Configurar: Acompanhamento' })
  await d.getByLabel('Protocolado').check()
  await d.getByLabel('Retorno em quantos dias úteis').fill('7')
  await d.getByRole('button', { name: 'Salvar e ligar' }).click()
  await expect(page.getByText('Acompanhamento: ligado.')).toBeVisible()
  expect(est.rpcs.find((x) => x.nome === 'agente_configurar')!.corpo).toEqual({ p_agente: 'acompanhamento', p_ativo: true, p_etapas: ['protocolado'], p_modelo: null, p_parametros: { dias: 7 } })
})

test('integrações: catálogo filtra e mostra quem responde pela captura', async ({ page }) => {
  await simularSupabase(page, { integracoes, agentes })
  await entrar(page); await expect(page).toHaveURL(/\/seu-dia$/); await page.goto('/integracoes')
  await expect(page.getByRole('note')).toContainText('responde pela captura')
  await page.getByRole('button', { name: 'Intimações, prazos e processos' }).click()
  await expect(page.locator('.conector')).toHaveCount(3)
  await page.getByRole('button', { name: /^Escavador/ }).click()
  const d = page.getByRole('dialog', { name: 'Escavador' })
  await expect(d.getByText(/Já dá para guardar a chave/)).toBeVisible()
  await expect(d.getByText(/A captura é do Escavador/)).toBeVisible()
})
