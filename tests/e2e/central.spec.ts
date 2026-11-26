import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const escritorio = {
  id: 'esc-2', nome: 'Rocha Advocacia', cidade: 'Chapecó/SC', ativo: true, oabs_master: ['OAB/SC 11.111'], plano: 'pro', situacao: 'teste', fundador: true,
  teste_ate: '2027-01-20', pago_ate: null, obs: null, limites: { masters: 1, colaboradores: 1, oabs: 1, ia_mensal: 0 },
  uso: { masters: 1, colaboradores: 3, oabs: 1, ia_mes: 0 }, ajustes: 0,
}
const detalhe = {
  ajustes: [], historico: [],
  recursos: [{ recurso: 'casos', no_plano: true, liberado: true }, { recurso: 'financeiro', no_plano: false, liberado: false }],
  pessoas: [{ email: 'bia@rocha.exemplo.br', nome: 'Bia Rocha', papel: 'colaborador', bloqueios: [] }],
}

test('Central HiAdv: painel, ficha com abas, plano, pagamento, controle com motivo e pessoas', async ({ page }) => {
  const estado = await simularSupabase(page, { papel: 'code', central: [{ ...escritorio, saude: 35, preco: 119.9, master_nome: 'Lia Rocha' }], centralDetalhe: detalhe })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/central')
  await expect(page.getByRole('heading', { name: 'Central HiAdv' })).toBeVisible()
  await expect(page.getByText('R$ 397,50').first()).toBeVisible()
  await expect(page.getByText('Acima do plano: Colaboradores 3/1')).toBeVisible()
  await expect(page.getByText('35 · Pouco uso')).toBeVisible()
  await page.getByRole('button', { name: /Rocha Advocacia/ }).click()
  const ficha = page.getByRole('dialog', { name: 'Rocha Advocacia' })
  await expect(ficha.getByText('Lia Rocha · OAB/SC 11.111')).toBeVisible()
  await ficha.getByRole('tab', { name: 'Assinatura' }).click()
  await ficha.getByRole('combobox', { name: 'Plano', exact: true }).selectOption('premium')
  await ficha.getByRole('button', { name: 'Salvar plano' }).click()
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_central_assinatura')?.corpo).toMatchObject({ p_id: 'esc-2', p: { plano: 'premium', situacao: 'teste', fundador: true, teste_ate: '2027-01-20' } })
  await ficha.getByLabel('Pago em').fill('05112026')
  await expect(ficha.getByLabel('Pago em')).toHaveValue('05/11/2026')
  await ficha.getByRole('button', { name: 'Registrar pagamento' }).click()
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_central_pagamento')?.corpo).toMatchObject({ p_id: 'esc-2', p_valor: 119.9, p_pago_em: '2026-11-05', p_forma: 'pix' })
  await ficha.getByRole('tab', { name: 'Controle' }).click()
  await ficha.getByRole('group', { name: 'Ajuste de Financeiro e honorários' }).getByRole('button', { name: 'Liberado' }).click()
  await ficha.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Escreva o motivo (fica no histórico).')).toBeVisible()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_central_ajuste')).toBeUndefined()
  await ficha.getByLabel(/Motivo para/).fill('Cortesia no teste')
  await ficha.getByRole('button', { name: 'Aplicar' }).click()
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_central_ajuste')?.corpo).toMatchObject({ p_recurso: 'financeiro', p_valor: 'liberado' })
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_central_motivo')?.corpo).toMatchObject({ p_texto: expect.stringContaining('Cortesia no teste') })
  await ficha.getByRole('tab', { name: 'Pessoas' }).click()
  await ficha.getByLabel('Fechar um recurso para Bia Rocha').selectOption('casos')
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_pessoa_ajuste')?.corpo).toMatchObject({ p_email: 'bia@rocha.exemplo.br', p_recurso: 'casos', p_bloquear: true })
})

test('Central: novo escritório em 3 passos', async ({ page }) => {
  const estado = await simularSupabase(page, { papel: 'code', central: [escritorio], centralDetalhe: detalhe })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/central')
  await page.getByRole('button', { name: 'Novo escritório' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText('Informe o nome do escritório.')).toBeVisible()
  await page.getByLabel('Nome do escritório').fill('Souza Previdenciário')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Nome do Gestor').fill('Rui Souza')
  await page.getByLabel('E-mail do Gestor').fill('rui@souza.exemplo.br')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Criar escritório' }).click()
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_central_novo')?.corpo).toMatchObject({ p: { nome: 'Souza Previdenciário', master_email: 'rui@souza.exemplo.br' } })
})

test('Central: quem não é code não abre', async ({ page }) => {
  await simularSupabase(page, {})
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/central')
  await expect(page.getByText('Esta tela é da administração do HiAdv.')).toBeVisible()
})

test('plano Júnior: Financeiro e Relatórios somem do menu e a tela explica', async ({ page }) => {
  await simularSupabase(page, { meusRecursos: { plano: 'pro', situacao: 'teste', teste_ate: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), recursos: ['casos', 'clientes', 'prazos', 'publicacoes', 'atendimentos', 'agenda', 'acompanhamento', 'documentos', 'celular'] } })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  if (test.info().project.name === 'computador') {
    await expect(page.getByRole('link', { name: 'Publicações' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Financeiro' })).toHaveCount(0)
  }
  await page.goto('/financeiro')
  await expect(page.getByRole('heading', { name: 'Financeiro e honorários' })).toBeVisible()
  await expect(page.getByText('Ele faz parte do plano Pleno')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'O teste termina' })).toBeVisible()
})
