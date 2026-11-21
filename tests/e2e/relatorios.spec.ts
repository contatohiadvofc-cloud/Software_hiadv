import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const relatorio = {
  dias: 90, casos: { abertos: 17, novos: 18, encerrados: 1 },
  etapas: [{ area: 'administrativo', etapa: 'ag. docs do(a) cliente', casos: 3, media_dias: 14.5, maior_dias: 31 }, { area: 'judicial', etapa: 'protocolado', casos: 2, media_dias: 4.2, maior_dias: 5 }],
  ciclo: [{ area: 'administrativo', casos: 1, media_dias: 35 }],
  pessoas: [{ email: 'ana@x', nome: 'Ana', abertas: 3, atrasadas: 1, feitas: 4, no_prazo: 3, minutos: 150, casos: 5 }],
  atendimentos: { novos: 12, contratou: 3, perdido: 1, em_aberto: 5, motivos: [{ motivo: 'Achou caro', n: 1 }] },
  clientes: { total: 40, novos: 4, origens: [{ origem: 'whatsapp', n: 3 }] },
  prazos: { publicacoes: 12, cumpridos: 9, em_aberto: 3, vencidos: 1 },
  financeiro: { meses: [{ mes: '2026-11', recebido: 1500, pago: 200 }], em_atraso: 800, a_receber: 1300, clientes_em_atraso: 1 },
}

test('relatórios: indicadores, gargalo destacado, equipe e dinheiro; período muda a consulta', async ({ page }) => {
  const estado = await simularSupabase(page, { relatorio })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/relatorios')
  await expect(page.locator('.fin-cartao', { hasText: 'Casos abertos' }).locator('dd')).toHaveText('17')
  await expect(page.getByText('Gargalo: Ag. docs do(a) cliente (Previdenciário administrativo, 14,5 dias em média).', { exact: false })).toBeVisible()
  await expect(page.getByRole('row', { name: /Ana/ })).toContainText('1')
  await expect(page.getByRole('row', { name: /Ana/ })).toContainText('75%')
  await expect(page.getByRole('row', { name: /Ana/ })).toContainText('2h30')
  await expect(page.getByText('3 (75% dos encerrados)')).toBeVisible()
  await expect(page.getByText('Por que não fecharam: Achou caro (1).')).toBeVisible()
  await expect(page.getByText('R$ 800,00')).toBeVisible()
  await page.getByRole('button', { name: '12 meses' }).click()
  await expect.poll(() => estado.rpcs.filter((x) => x.nome === 'hiadv_relatorio').map((x) => x.corpo.p_dias)).toContain(365)
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  const r = await new AxeBuilder({ page }).include('main').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})

test('colaborador não vê relatórios', async ({ page }) => {
  await simularSupabase(page, { papel: 'colaborador', relatorio })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/relatorios')
  await expect(page.getByText('Os relatórios ficam com o Gestor Master.')).toBeVisible()
})
