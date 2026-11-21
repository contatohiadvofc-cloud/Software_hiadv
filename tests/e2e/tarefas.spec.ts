import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const tarefas = [
  { id: 't1', titulo: 'Pedir CTPS ao cliente', detalhe: 'Carla Mendes', prazo: '2026-01-02', prazo_fatal: null, responsavel: 'ana@silvaprado.exemplo.br' },
  { id: 't2', titulo: 'Manifestação sobre o laudo', detalhe: null, prazo: null, prazo_fatal: hoje, responsavel: 'ana@silvaprado.exemplo.br' },
]

async function abrir(page: import('@playwright/test').Page) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/tarefas')
}

test('tarefas: agrupa por prazo e marca prazo fatal', async ({ page }) => {
  await simularSupabase(page, { tarefas })
  await abrir(page)
  await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible()
  await expect(page.locator('.hv-group-title')).toHaveText([/Atrasadas\s*1/, /Hoje\s*1/])
  await expect(page.getByText('Prazo fatal')).toBeVisible()
})

test('concluir chama o servidor e oferece desfazer', async ({ page }) => {
  const est = await simularSupabase(page, { tarefas })
  await abrir(page)
  await page.getByRole('button', { name: 'Concluir: Pedir CTPS ao cliente' }).click()
  await expect(page.getByText('Tarefa concluída.')).toBeVisible()
  await expect(page.getByText('Pedir CTPS ao cliente')).toBeHidden()
  expect(est.tarefasMudadas[0]).toEqual({ p_id: 't1', p_status: 'feita' })
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect.poll(() => est.tarefasMudadas.length).toBe(2)
  expect(est.tarefasMudadas[1]).toEqual({ p_id: 't1', p_status: 'aberta' })
})

test('nova tarefa: confere o título e envia ao servidor', async ({ page }) => {
  const est = await simularSupabase(page, { tarefas })
  await abrir(page)
  await page.getByRole('button', { name: 'Nova tarefa' }).click()
  const dlg = page.getByRole('dialog', { name: 'Nova tarefa' })
  await dlg.getByRole('button', { name: 'Criar tarefa' }).click()
  await expect(dlg.getByText('Escreva o que precisa ser feito.')).toBeVisible()
  expect(est.tarefasCriadas).toHaveLength(0)
  await dlg.getByLabel('O que precisa ser feito').fill('Ligar para o perito')
  await dlg.getByLabel('Prazo').fill(hoje)
  await dlg.getByRole('button', { name: 'Criar tarefa' }).click()
  await expect(page.getByText('Tarefa criada.')).toBeVisible()
  expect(est.tarefasCriadas[0]).toMatchObject({ p_titulo: 'Ligar para o perito', p_responsavel: 'ana@silvaprado.exemplo.br', p_prazo: hoje })
})
