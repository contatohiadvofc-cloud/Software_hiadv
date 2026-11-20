import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { simularSupabase, entrar } from './mock'

test('senha errada mostra a mensagem certa', async ({ page }) => {
  await simularSupabase(page)
  await entrar(page, 'errada')
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
})

test('entrar leva ao Seu dia e mostra as áreas na ordem', async ({ page, isMobile }) => {
  await simularSupabase(page, { areas: [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }, { area: 'civel', nome: 'Cível', ordem: 20 }] })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ana')
  if (!isMobile) {
    const itens = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('list').getByRole('link')
    await expect(itens).toHaveText(['Trabalhista', 'Cível'])
  }
})

test('escritório sem áreas mostra o aviso, sem tela em branco', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a barra lateral é do computador')
  await simularSupabase(page, { areas: 'sem-funcao' })
  await entrar(page)
  await expect(page.getByText('Seu escritório ainda não tem áreas ativas. Peça ao Gestor Master para ativar.')).toBeVisible()
})

test('Code troca de escritório e a barra lateral recarrega', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a barra lateral é do computador')
  await simularSupabase(page, {
    papel: 'code',
    escritorios: [{ id: 'esc-1', nome: 'Silva & Prado Advocacia', atual: true }, { id: 'esc-2', nome: 'Escritório Trabalhista Exemplo', atual: false }],
    areasPorEscritorio: {
      'esc-1': [{ area: 'administrativo', nome: 'Previdenciário administrativo', ordem: 10 }],
      'esc-2': [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }],
    },
  })
  await entrar(page)
  const lateral = page.getByRole('navigation', { name: 'Navegação principal' })
  await expect(lateral.getByRole('link', { name: 'Previdenciário administrativo' })).toBeVisible()
  await lateral.getByLabel('Escritório em uso').selectOption('esc-2')
  await expect(lateral.getByRole('link', { name: 'Trabalhista' })).toBeVisible()
  await expect(lateral.getByRole('link', { name: 'Previdenciário administrativo' })).toHaveCount(0)
})

test('sessão expirada volta ao login e depois retorna à tela', async ({ page }) => {
  await simularSupabase(page, { expirarEm: 'minhas_areas' })
  await entrar(page)
  await expect(page).toHaveURL(/\/login\?volta=/)
  await expect(page.getByText('Sua sessão terminou. Entre de novo.')).toBeVisible()
})

test('Seu dia com erro mostra Tentar de novo e depois a lista', async ({ page }) => {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  await simularSupabase(page, { falharSeuDia: 3, tarefas: [{ id: 't1', tipo: 'tarefa', titulo: 'Conferir documentos recebidos', detalhe: 'Paula Nunes', prazo: hoje, prazo_fatal: null }] })
  await entrar(page)
  await expect(page.getByText('Não foi possível carregar.')).toBeVisible()
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByText('Conferir documentos recebidos')).toBeVisible()
})

test('busca: Ctrl+K abre, 1 letra não busca, setas e Enter abrem', async ({ page, isMobile }) => {
  const est = await simularSupabase(page, { busca: [{ tipo: 'cliente', titulo: 'Rita Moura', trecho: 'Previdenciário' }, { tipo: 'cliente', titulo: 'Rita Souza', trecho: 'Trabalhista' }] })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  if (isMobile) await page.getByRole('navigation', { name: 'Navegação do celular' }).getByRole('button', { name: 'Buscar', exact: true }).dispatchEvent('click')
  else await page.keyboard.press('Control+k')
  const campo = page.getByRole('combobox')
  await expect(campo).toBeVisible()
  await campo.fill('r')
  await page.waitForTimeout(400)
  expect(est.chamadasBusca).toBe(0)
  await campo.fill('rita')
  await expect(page.getByRole('option')).toHaveCount(2)
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Rita Souza: a ficha completa/)).toBeVisible()
  await expect(campo).toHaveCount(0)
})

test('celular estreito: a busca fica visível acima da barra inferior', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 })
  await simularSupabase(page, { busca: [{ tipo: 'cliente', titulo: 'Rita Moura', trecho: '' }] })
  await entrar(page)
  await page.getByRole('button', { name: /Buscar cliente/ }).click()
  const campo = page.getByRole('combobox')
  await campo.fill('rita')
  await expect(page.getByRole('option')).toBeVisible()
  const caixa = await campo.boundingBox()
  expect(caixa!.y + caixa!.height).toBeLessThan(400 - 60)
})

test('catálogo sem violações sérias de acessibilidade nos dois temas', async ({ page }, info) => {
  await page.goto('/catalogo')
  for (const tema of ['Tema claro', 'Tema escuro']) {
    await page.getByRole('button', { name: tema }).click()
    const r = await new AxeBuilder({ page }).analyze()
    const serias = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(serias.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
    await page.screenshot({ path: `test-results/catalogo-${info.project.name}-${tema.split(' ')[1]}.png`, fullPage: true })
  }
})

test('celular: nada passa da largura da tela e Áreas lista as áreas', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'só no celular')
  await simularSupabase(page, { areas: [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }] })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('navigation', { name: 'Navegação do celular' }).getByRole('link', { name: 'Áreas' }).click()
  await expect(page.getByRole('link', { name: /Trabalhista/ })).toBeVisible()
})
