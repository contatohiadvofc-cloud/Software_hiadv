import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

// Horários em UTC que caem às 12:30 e 17:00 em Brasília, daqui a 2 dias
const em2 = (h: number) => { const d = new Date(Date.now() + 2 * 86400000); d.setUTCHours(h, 30, 0, 0); return d.toISOString() }

test('agenda: perícias e audiências por dia, com filtro e link para o cliente', async ({ page }) => {
  await simularSupabase(page, {
    pericias: [
      { id: 'p1', tipo: 'medica', status: 'agendada', data_hora: em2(15), local: 'Central de Perícias', cliente: 'Rita Moura', cliente_id: 'c1', responsavel: 'Ana' },
      { id: 'p2', tipo: 'medica', status: 'cancelada', data_hora: em2(16), local: '', cliente: 'Cancelado', cliente_id: 'c9', responsavel: '' },
    ],
    audienciasLista: [{ id: 'a1', tipo: 'inicial', modo: 'virtual', status: 'marcada', data_hora: em2(19), local: '1ª Vara', cliente: 'Bruno Teixeira', cliente_id: 'c2', responsavel: 'Rafael' }],
    clientes: [{ id: 'c1', nome: 'Rita Moura', telefone: null, origem: null, criado_em: null }],
  })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/agenda')
  await expect(page.getByText('Perícia médica · Rita Moura')).toBeVisible()
  await expect(page.getByText('Audiência inicial · Bruno Teixeira')).toBeVisible()
  await expect(page.getByText('Virtual · 1ª Vara')).toBeVisible()
  await expect(page.getByText(/Cancelado/)).toHaveCount(0)
  await expect(page.getByText('12:30')).toBeVisible()
  await page.getByRole('button', { name: 'Audiências' }).click()
  await expect(page.getByText('Perícia médica · Rita Moura')).toBeHidden()
  await page.getByRole('button', { name: 'Tudo' }).click()
  await page.getByText('Perícia médica · Rita Moura').click()
  await expect(page).toHaveURL(/\/clientes\/c1$/)
})
