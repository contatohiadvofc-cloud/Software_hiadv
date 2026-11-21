import { test, expect, type Page } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

async function responder(page: Page, rotulos: string[][]) {
  for (const grupo of rotulos) {
    for (const r of grupo) await page.getByRole('button', { name: r, exact: true }).click()
    if (grupo.length > 1 || ['Previdenciário', 'Não perder prazos e intimações', 'Usar IA para peças e documentos'].includes(grupo[0])) {
      const b = page.getByRole('button', { name: /Continuar|Ver meu plano/ })
      await b.click()
    }
  }
}

test('aderir: 5 perguntas, plano recomendado, pedido com indicação e sem login', async ({ page }) => {
  const estado = await simularSupabase(page, { vagas: 17 })
  await page.goto('/aderir?ref=ana7k2q')
  await expect(page.getByRole('heading', { level: 1, name: 'Qual HiAdv combina com o seu escritório?' })).toBeVisible()
  await expect(page.getByText('restam 17 de 20 vagas de fundador', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Começar' }).click()
  await responder(page, [['Sozinho(a)'], ['Até 100'], ['Uma'], ['Previdenciário'], ['Não perder prazos e intimações']])
  await expect(page.getByRole('heading', { name: 'Júnior', exact: true })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Pleno/ })).toContainText('R$ 169,90')
  await page.getByRole('radio', { name: /Pleno/ }).click()
  await expect(page.getByText('O que o Pleno inclui')).toBeVisible()
  await page.getByLabel('Nome completo').fill('Carla Souza')
  await page.getByLabel('E-mail').fill('carla@exemplo.com')
  await page.getByLabel('WhatsApp').fill('(49) 98888-1111')
  await page.getByRole('button', { name: 'Pedir adesão' }).click()
  await expect(page.getByRole('alert')).toContainText('Marque que concorda')
  await page.getByLabel('Concordo que o HiAdv use estes dados', { exact: false }).check()
  await page.getByRole('button', { name: 'Pedir adesão' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido recebido.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Falar no WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/5549999730572\?text=/)
  const corpo = estado.rpcs.find((x) => x.nome === 'hiadv_adesao_enviar')?.corpo.p as Record<string, unknown>
  expect(corpo).toMatchObject({ plano: 'premium', recomendado: 'pro', ref: 'ANA7K2Q', consentimento: true })
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  const r = await new AxeBuilder({ page }).include('main').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})

test('aderir: quem quer IA vê o Sênior como lista de interesse', async ({ page }) => {
  const estado = await simularSupabase(page, { vagas: 0 })
  await page.goto('/aderir')
  await expect(page.getByText('vagas de fundador')).toHaveCount(0)
  await page.getByRole('button', { name: 'Começar' }).click()
  await responder(page, [['Com equipe de 3 a 10 pessoas'], ['De 100 a 500'], ['Duas ou três'], ['Cível', 'Família'], ['Usar IA para peças e documentos']])
  await expect(page.getByRole('heading', { name: 'Sênior', exact: true })).toBeVisible()
  await expect(page.getByText('começar pelo Pleno', { exact: false })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Sênior/ })).toContainText('R$ 297,00')
  await expect(page.getByRole('heading', { name: 'Entrar na lista do Sênior' })).toBeVisible()
  await page.getByLabel('Nome completo').fill('Bruno Lima')
  await page.getByLabel('E-mail').fill('bruno@exemplo.com')
  await page.getByLabel('WhatsApp').fill('49977772222')
  await page.getByLabel('Concordo que o HiAdv use estes dados', { exact: false }).check()
  await page.getByRole('button', { name: 'Entrar na lista' }).click()
  await expect(page.getByRole('heading', { name: 'Você está na lista.' })).toBeVisible()
  expect((estado.rpcs.find((x) => x.nome === 'hiadv_adesao_enviar')?.corpo.p as Record<string, unknown>).plano).toBe('supremo')
})

test('indique o HiAdv: link pessoal, WhatsApp e indicações com cortesia', async ({ page }) => {
  await simularSupabase(page, { indicacoes: [
    { id: 'i1', primeiro_nome: 'Carla', plano: 'premium', status: 'ativada', cortesia: 'pendente', criado_em: '2026-11-20T12:00:00Z', quem: 'ana@silvaprado.exemplo.br', minha: true },
    { id: 'i2', primeiro_nome: 'Bruno', plano: 'pro', status: 'nova', cortesia: 'nenhuma', criado_em: '2026-11-21T12:00:00Z', quem: 'rafael@silvaprado.exemplo.br', minha: false },
  ] })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/indicar')
  await expect(page.getByLabel('Link pessoal de indicação')).toHaveValue(/\/aderir\?ref=ANA7K2Q$/)
  await expect(page.getByRole('link', { name: 'Enviar pelo WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
  await expect(page.getByText('Carla · Pleno')).toBeVisible()
  await expect(page.getByText('1 mês grátis a aplicar')).toBeVisible()
  await expect(page.getByText('indicado por rafael')).toBeVisible()
})

test('adesões: só a administração vê; trata situação, plano e fundador', async ({ page }) => {
  const adesoes = [
    { id: 'a1', nome: 'Carla Souza', email: 'carla@exemplo.com', whatsapp: '49988881111', oab: 'OAB/SC 12.345', escritorio: 'Souza Adv', cidade: 'Joaçaba', uf: 'SC', plano: 'premium', recomendado: 'pro',
      respostas: { atuacao: 'sozinho', prioridades: ['prazos'] }, indicador_email: 'ana@silvaprado.exemplo.br', indicador_escritorio: 'Silva & Prado', status: 'nova', fundador: false, cortesia: 'nenhuma', obs: null, criado_em: '2026-11-21T12:00:00Z' },
    { id: 'a2', nome: 'Bruno Lima', email: 'bruno@exemplo.com', whatsapp: '49977772222', oab: null, escritorio: null, cidade: null, uf: null, plano: 'supremo', recomendado: 'supremo',
      respostas: {}, indicador_email: null, indicador_escritorio: null, status: 'nova', fundador: false, cortesia: 'nenhuma', obs: null, criado_em: '2026-11-21T13:00:00Z' },
  ]
  const estado = await simularSupabase(page, { papel: 'code', adesoes, vagas: 20 })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/adesoes')
  await expect(page.getByText('20 de 20 vagas de fundador restantes. 1 pessoa na lista do Sênior.')).toBeVisible()
  await expect(page.getByText('Carla Souza · Souza Adv')).toBeVisible()
  await expect(page.getByText('Bruno Lima')).toHaveCount(0)
  await expect(page.getByText('Sozinho(a) · Não perder prazos e intimações')).toBeVisible()
  await page.getByLabel('Fundador').check()
  await page.getByLabel('Situação').selectOption('ativada')
  await expect.poll(() => estado.rpcs.filter((x) => x.nome === 'hiadv_adesao_atualizar').map((x) => [x.corpo.p_status, x.corpo.p_fundador])).toEqual([['nova', true], ['ativada', null]])
  await page.getByRole('button', { name: 'Lista do Sênior' }).click()
  await expect(page.getByText('Bruno Lima')).toBeVisible()
})

test('colaborador não vê a tela de adesões', async ({ page }) => {
  await simularSupabase(page, { papel: 'colaborador' })
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto('/adesoes')
  await expect(page.getByText('Esta tela é da administração do HiAdv.')).toBeVisible()
})
