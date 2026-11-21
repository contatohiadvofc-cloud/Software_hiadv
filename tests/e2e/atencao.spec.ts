import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const atencao = [
  { tipo: 'parado', id: 'k1', titulo: 'Paulo Henrique Dias', detalhe: 'Em "fazendo inicial" há 14 dias', dia: '2026-11-07', responsavel: 'julia.costa@silvaprado.exemplo.br', cliente_id: 'c1', caso_id: 'k1', gravidade: 'media', escalado: true },
  { tipo: 'preparo', id: 'pe1', evento: 'pericia', titulo: 'Rosa Maria Lima', detalhe: 'Perícia 23/11 às 09:30 · Fórum', dia: '2026-11-23', responsavel: null, cliente_id: 'c2', caso_id: null, gravidade: 'alta', escalado: false },
  { tipo: 'prazo', id: 't1', titulo: 'Contestação: Ana Souza', detalhe: 'Fatal 24/11', dia: '2026-11-24', responsavel: 'ana@silvaprado.exemplo.br', cliente_id: 'c3', caso_id: null, gravidade: 'alta', escalado: false },
]

test('seu dia: precisa de atenção em ordem, com quem é o responsável e preparação em um clique', async ({ page }) => {
  const est = await simularSupabase(page, { atencao })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  const painel = page.getByRole('region', { name: 'Precisa de atenção' })
  await expect(painel.locator('.atencao-item')).toHaveCount(3)
  await expect(painel.locator('.atencao-item').first()).toContainText('Prazo fatal')
  await expect(painel.locator('.atencao-item').nth(1)).toContainText('Preparar perícia')
  await expect(painel.getByText(/há 14 dias · com Julia/)).toBeVisible()
  await painel.getByRole('button', { name: 'Criar preparação' }).click()
  await expect(page.getByText('Tarefa de preparação criada, com roteiro.')).toBeVisible()
  expect(est.rpcs.find((x) => x.nome === 'preparo_criar')?.corpo).toEqual({ p_evento: 'pericia', p_id: 'pe1' })
})

test('seu dia: sem nada pedindo atenção, o painel não aparece', async ({ page }) => {
  await simularSupabase(page, {})
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await expect(page.getByRole('region', { name: 'Sua agenda' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Precisa de atenção' })).toHaveCount(0)
})

test('configurações: regras de atenção validam e vão ao servidor', async ({ page }) => {
  const est = await simularSupabase(page, {
    papel: 'master',
    areas: [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 1 }],
    etapas: [{ area: 'trabalhista', status: 'pendente', ordem: 1, final: false }, { area: 'trabalhista', status: 'ag. audiência', ordem: 2, final: false }],
  })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/configuracoes')
  const regras = page.getByRole('region', { name: 'Regras de atenção' })
  await regras.getByLabel('Caso parado: dias na mesma etapa').fill('1')
  await regras.getByRole('button', { name: 'Salvar regras' }).click()
  await expect(regras.getByRole('alert')).toContainText('2 a 90')
  await regras.getByLabel('Caso parado: dias na mesma etapa').fill('15')
  await regras.getByLabel(/Ag\. audiência/i).check()
  await regras.getByRole('button', { name: 'Salvar regras' }).click()
  await expect(page.getByText('Regras salvas.')).toBeVisible()
  expect(est.rpcs.find((x) => x.nome === 'regras_salvar')?.corpo).toEqual({ p: { parado_dias: 15, preparo_dias: 5, fatal_alerta_dias: 2, parado_ignorar: ['ag. audiência'] } })
})
