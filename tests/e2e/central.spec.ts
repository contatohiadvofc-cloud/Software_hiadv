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

test('Central HiAdv: o code vê o escritório, troca o plano e libera um recurso', async ({ page }) => {
  const estado = await simularSupabase(page, { papel: 'code', central: [escritorio], centralDetalhe: detalhe })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/central')
  await expect(page.getByRole('heading', { name: 'Central HiAdv' })).toBeVisible()
  await expect(page.getByText('Acima do plano: Colaboradores 3/1')).toBeVisible()
  await page.getByRole('button', { name: /Rocha Advocacia/ }).click()
  await page.getByRole('combobox', { name: 'Plano', exact: true }).selectOption('premium')
  await page.getByRole('button', { name: 'Salvar plano' }).click()
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_central_assinatura')?.corpo).toMatchObject({ p_id: 'esc-2', p: { plano: 'premium', situacao: 'teste', fundador: true } })
  await page.getByLabel('Ajuste de Financeiro e honorários').selectOption('liberado')
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_central_ajuste')?.corpo).toMatchObject({ p_recurso: 'financeiro', p_valor: 'liberado' })
  await page.getByLabel('Fechar um recurso para Bia Rocha').selectOption('casos')
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_pessoa_ajuste')?.corpo).toMatchObject({ p_email: 'bia@rocha.exemplo.br', p_recurso: 'casos', p_bloquear: true })
})

test('Central: quem não é code não abre', async ({ page }) => {
  await simularSupabase(page, {})
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/central')
  await expect(page.getByText('Esta tela é da administração do HiAdv.')).toBeVisible()
})

test('plano Júnior: Financeiro e Relatórios somem do menu e a tela explica', async ({ page }) => {
  await simularSupabase(page, { meusRecursos: { plano: 'pro', situacao: 'teste', teste_ate: '2026-11-23', recursos: ['casos', 'clientes', 'prazos', 'publicacoes', 'atendimentos', 'agenda', 'acompanhamento', 'documentos', 'celular'] } })
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
