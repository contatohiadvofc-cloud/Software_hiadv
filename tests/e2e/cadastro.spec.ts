import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const clientes = [{ id: 'c1', nome: 'Bruno Teixeira', telefone: '49999110002', origem: 'whatsapp', criado_em: '2026-09-10T12:00:00Z' }]

async function abrir(page: import('@playwright/test').Page, rota: string) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto(rota)
}

test('novo cliente: confere o CPF antes de enviar e abre a página do cliente', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes })
  await abrir(page, '/clientes')
  await page.getByRole('button', { name: 'Novo cliente' }).click()
  const d = page.getByRole('dialog', { name: 'Novo cliente' })
  await d.getByLabel('Nome completo').fill('Marta Ficticia')
  await d.getByLabel('CPF (opcional)').fill('123.456.789-00')
  await d.getByRole('button', { name: 'Cadastrar cliente' }).click()
  await expect(d.getByRole('alert')).toHaveText('CPF inválido.')
  expect(estado.rpcs.some((x) => x.nome === 'hiadv_cliente_criar')).toBe(false)
  await d.getByLabel('CPF (opcional)').fill('111.444.777-35')
  await d.getByRole('button', { name: 'Cadastrar cliente' }).click()
  await expect(page).toHaveURL(/\/clientes\/c-novo$/)
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_cliente_criar')?.corpo).toMatchObject({ p: { nome: 'Marta Ficticia', cpf: '111.444.777-35' } })
})

test('novo caso pela página do cliente: área, responsável e relato; abre a ficha', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes, areas: [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 1 }, { area: 'administrativo', nome: 'Previdenciário administrativo', ordem: 2 }] })
  await abrir(page, '/clientes/c1')
  await page.getByRole('button', { name: 'Novo caso' }).click()
  const d = page.getByRole('dialog', { name: 'Novo caso' })
  await expect(d.getByText('Bruno Teixeira')).toBeVisible()
  await expect(d.getByLabel('Benefício')).toBeHidden()
  await d.getByLabel('Área').selectOption('administrativo')
  await d.getByLabel('Benefício').selectOption('bpc')
  await d.getByLabel('Responsável').selectOption('rafael@silvaprado.exemplo.br')
  await d.getByLabel('Relato do cliente (opcional)').fill('Relato fictício.')
  await d.getByRole('button', { name: 'Abrir caso' }).click()
  await expect(d).toBeHidden()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_caso_criar')?.corpo).toEqual({ p_cliente: 'c1', p_area: 'administrativo', p_produto: 'bpc', p_relato: 'Relato fictício.', p_responsavel: 'rafael@silvaprado.exemplo.br' })
})

test('novo caso pelo quadro com cliente novo', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes })
  await abrir(page, '/area/trabalhista')
  await page.getByRole('button', { name: 'Novo caso' }).click()
  const d = page.getByRole('dialog', { name: 'Novo caso' })
  await d.getByLabel('Buscar pelo nome').fill('Zé Nin')
  await expect(d.getByText('Nenhum cliente com esse nome.')).toBeVisible()
  await d.getByRole('button', { name: 'Cadastrar cliente novo' }).click()
  await expect(d.getByLabel('Nome completo')).toHaveValue('Zé Nin')
  await d.getByLabel('Nome completo').fill('Zé Ninguém Fictício')
  await d.getByRole('button', { name: 'Abrir caso' }).click()
  await expect(d).toBeHidden()
  const nomes = estado.rpcs.map((x) => x.nome)
  expect(nomes).toEqual(expect.arrayContaining(['hiadv_cliente_criar', 'hiadv_caso_criar']))
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_caso_criar')?.corpo).toMatchObject({ p_cliente: 'c-novo', p_area: 'trabalhista', p_produto: null })
})

test('importar planilha: confere antes e só então grava', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes })
  await abrir(page, '/clientes')
  await page.getByRole('button', { name: 'Importar planilha' }).click()
  const d = page.getByRole('dialog', { name: 'Importar clientes' })
  await d.getByLabel('Ou cole aqui').fill('Nome\tCPF\tTelefone\nAna Fictícia\t529.982.247-25\t49999990000\nX\t\t\nCarlos Fictício\t\t')
  await expect(d.getByText('3 linhas encontradas.')).toBeVisible()
  await d.getByRole('button', { name: 'Conferir antes de importar' }).click()
  await expect(d.getByText('Linha 2 (X): Nome em branco ou curto demais.')).toBeVisible()
  expect(estado.rpcs.at(-1)?.corpo).toMatchObject({ p_simular: true })
  await d.getByRole('button', { name: 'Importar 2 clientes' }).click()
  await expect(d).toBeHidden()
  expect(estado.rpcs.at(-1)?.corpo).toMatchObject({ p_simular: false })
  await expect(page.getByText('2 clientes importados.')).toBeVisible()
})

test('colaborador não vê a importação', async ({ page }) => {
  await simularSupabase(page, { clientes, papel: 'colaborador' })
  await abrir(page, '/clientes')
  await expect(page.getByRole('button', { name: 'Novo cliente' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Importar planilha' })).toHaveCount(0)
})

test('diálogos de cadastro sem violações sérias de acessibilidade', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await simularSupabase(page, { clientes })
  await abrir(page, '/clientes')
  for (const nome of ['Novo cliente', 'Importar planilha']) {
    await page.getByRole('button', { name: nome }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const r = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
    expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
    await page.keyboard.press('Escape')
  }
})
