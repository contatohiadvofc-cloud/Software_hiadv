import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const hoje = new Date().toLocaleDateString('sv-SE')
const mes = hoje.slice(0, 7)
const passado = new Date(Date.now() - 40 * 864e5).toISOString().slice(0, 10)
const lancamentos = [
  { id: 'a', sentido: 'entrada', etiqueta: 'Honorários', titulo: 'Parcela 1/3 · Bruno Teixeira', descricao: null, valor: 800, vencimento: passado, pago_em: null, cliente_id: 'c1', cliente: 'Bruno Teixeira', telefone: '49999110002', honorario_id: 'h' },
  { id: 'b', sentido: 'entrada', etiqueta: 'Honorários', titulo: 'Parcela 2/3 · Bruno Teixeira', descricao: null, valor: 800, vencimento: `${mes}-28`, pago_em: null, cliente_id: 'c1', cliente: 'Bruno Teixeira', telefone: '49999110002', honorario_id: 'h' },
  { id: 'c', sentido: 'saida', etiqueta: 'Despesas', titulo: 'Internet', descricao: null, valor: 120, vencimento: `${mes}-01`, pago_em: `${mes}-01`, cliente_id: null, cliente: null, telefone: null, honorario_id: null },
]
const clientes = [{ id: 'c1', nome: 'Bruno Teixeira', telefone: '49999110002', origem: 'whatsapp', criado_em: '2026-09-10T12:00:00Z' }]

async function abrir(page: import('@playwright/test').Page, rota: string) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto(rota)
}

test('financeiro: resumo do mês, atraso com lembrete cordial e baixa com desfazer', async ({ page }) => {
  const estado = await simularSupabase(page, { lancamentos, clientes })
  await abrir(page, '/financeiro')
  const cartao = (rot: string) => page.locator('.fin-cartao', { hasText: rot }).locator('dd')
  await expect(cartao('Em atraso')).toHaveText(/800,00/)
  await expect(cartao('Despesas do mês')).toHaveText(/120,00/)
  const atraso = page.getByRole('region', { name: /Em atraso/ })
  const wa = atraso.getByRole('link', { name: 'Lembrete no WhatsApp' })
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/5549999110002\?text=Ol%C3%A1%2C%20Bruno!/)
  await atraso.getByRole('button', { name: 'Recebido: Parcela 1/3 · Bruno Teixeira' }).click()
  await expect(page.getByText('Recebimento registrado.')).toBeVisible()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_fin_baixar')?.corpo).toEqual({ p_id: 'a', p_pago_em: hoje })
})

test('novo contrato fixo + êxito mostra a prévia das parcelas e envia os valores lidos', async ({ page }) => {
  const estado = await simularSupabase(page, { lancamentos: [], clientes })
  await abrir(page, '/financeiro')
  await page.getByRole('button', { name: 'Novo contrato' }).click()
  const d = page.getByRole('dialog', { name: 'Novo contrato de honorários' })
  await d.getByLabel('Cliente', { exact: true }).fill('Bru')
  await d.getByRole('button', { name: 'Bruno Teixeira' }).click()
  await d.getByLabel('Valor fixo (R$)').fill('3.000,00')
  await d.getByLabel('Parcelas').fill('6')
  await d.getByLabel('Primeiro vencimento').fill('2026-12-10')
  await expect(d.getByText('6 parcelas de R$', { exact: false })).toContainText('10/12/2026 a 10/05/2027')
  await d.getByRole('button', { name: 'Lançar contrato' }).click()
  await expect(d).toBeHidden()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_honorario_criar')?.corpo).toEqual({ p: { cliente: 'c1', caso: null, tipo: 'misto', descricao: null, valor_fixo: 3000, parcelas: 6, primeiro_vencimento: '2026-12-10', percentual_exito: 30 } })
})

test('saída avulsa já paga', async ({ page }) => {
  const estado = await simularSupabase(page, { lancamentos: [] })
  await abrir(page, '/financeiro')
  await page.getByRole('button', { name: 'Nova entrada ou saída' }).click()
  const d = page.getByRole('dialog', { name: 'Nova entrada ou saída' })
  await d.getByLabel('Descrição').fill('Conta de luz de novembro')
  await d.getByLabel('Valor (R$)').fill('150,50')
  await d.getByRole('button', { name: 'Lançar' }).click()
  await expect(d).toBeHidden()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_fin_lancar')?.corpo).toMatchObject({ p: { sentido: 'saida', titulo: 'Conta de luz de novembro', valor: 150.5, pago: true } })
})

test('no cliente: êxito calculado sobre o valor recebido', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes, honorarios: [{ id: 'h', tipo: 'misto', descricao: null, valor_fixo: 3000, parcelas: 6, percentual_exito: 30, status: 'ativo', criado_em: '2026-09-01T12:00:00Z', recebido: 1000, a_receber: 2000, atrasado: 0 }] })
  await abrir(page, '/clientes/c1')
  const p = page.getByRole('region', { name: 'Honorários' })
  await expect(p.getByText('Fixo + êxito · R$ 3.000,00 em 6x · 30% de êxito')).toBeVisible()
  await p.getByRole('button', { name: 'Lançar êxito' }).click()
  const d = page.getByRole('dialog', { name: 'Lançar êxito' })
  await d.getByLabel('Quanto o cliente recebeu (R$)').fill('12.000,00')
  await expect(d.getByText('Honorário de 30%: R$ 3.600,00.')).toBeVisible()
  await d.getByRole('button', { name: 'Lançar no financeiro' }).click()
  await expect(page.getByText('Êxito de R$ 3.600,00 lançado no financeiro.')).toBeVisible()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_honorario_exito')?.corpo).toEqual({ p_honorario: 'h', p_valor_recebido: 12000 })
})

test('colaborador não vê o financeiro nem os honorários do cliente', async ({ page }) => {
  await simularSupabase(page, { clientes, papel: 'colaborador' })
  await abrir(page, '/financeiro')
  await expect(page.getByText('O financeiro fica com o Gestor Master.')).toBeVisible()
  await page.goto('/clientes/c1')
  await expect(page.getByRole('heading', { name: 'Bruno Teixeira' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Honorários' })).toHaveCount(0)
})

test('financeiro sem violações sérias de acessibilidade', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await simularSupabase(page, { lancamentos, clientes })
  await abrir(page, '/financeiro')
  await expect(page.locator('.fin-cartao').first()).toBeVisible()
  const r = await new AxeBuilder({ page }).include('main').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})
