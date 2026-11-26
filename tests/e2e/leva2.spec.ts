import { test, expect, type Page } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const leads = [
  { id: 'ld1', nome: 'Marcos Antunes', telefone: '49999220001', origem: 'Instagram', area: 'trabalhista', assunto: 'Horas extras sem pagamento.', etapa: 'novo', responsavel: 'ana@silvaprado.exemplo.br', proximo_contato: '2026-01-02', criado_em: '2026-11-01T12:00:00Z' },
  { id: 'ld2', nome: 'Paula Rech', telefone: null, origem: 'Indicação', area: null, assunto: null, etapa: 'proposta', responsavel: null, proximo_contato: null, criado_em: '2026-11-02T12:00:00Z' },
]
const clientes = [{ id: 'c1', nome: 'Bruno Teixeira', telefone: '49999110002', origem: 'whatsapp', criado_em: '2026-09-10T12:00:00Z' }]

async function ir(page: Page, rota: string) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto(rota)
}
const celular = (page: Page) => (page.viewportSize()?.width ?? 1200) < 700

test('atendimentos: inclui, mostra contato atrasado, avança e encerra com motivo', async ({ page }) => {
  const estado = await simularSupabase(page, { leads: structuredClone(leads) })
  await ir(page, '/atendimentos')
  await expect(page.getByRole('heading', { level: 1, name: 'Atendimentos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Marcos Antunes' })).toBeVisible()
  await expect(page.getByText('Contato atrasado')).toBeVisible()
  await expect(page.getByRole('link', { name: /WhatsApp de Marcos Antunes/ })).toHaveAttribute('href', 'https://wa.me/5549999220001')

  await page.getByRole('button', { name: 'Novo atendimento' }).click()
  await page.getByLabel('Nome').fill('Rita Souza')
  await page.getByLabel('Telefone ou WhatsApp (opcional)').fill('(49) 9')
  await page.getByRole('button', { name: 'Incluir atendimento' }).click()
  await expect(page.getByRole('alert')).toHaveText('Telefone com DDD (10 ou 11 números).')
  await page.getByLabel('Telefone ou WhatsApp (opcional)').fill('(49) 98888-7777')
  await page.getByLabel('Como chegou').selectOption('Instagram')
  await page.getByRole('button', { name: 'Incluir atendimento' }).click()
  await expect(page.getByText('Atendimento incluído.')).toBeVisible()
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_lead_salvar')?.corpo.p).toMatchObject({ nome: 'Rita Souza', origem: 'Instagram' })

  await page.getByLabel('Mover Marcos Antunes para').selectOption('conversa')
  await expect.poll(() => estado.rpcs.filter((x) => x.nome === 'hiadv_lead_etapa').map((x) => x.corpo.p_etapa)).toContain('conversa')

  if (celular(page)) await page.getByRole('tab', { name: /Proposta enviada/ }).click()
  await page.getByLabel('Mover Paula Rech para').selectOption('perdido')
  await expect(page.getByRole('dialog', { name: 'Não fechou' })).toBeVisible()
  await page.getByLabel('Motivo').selectOption('Achou caro')
  await page.getByRole('button', { name: 'Encerrar atendimento' }).click()
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_lead_etapa' && x.corpo.p_etapa === 'perdido')?.corpo.p_motivo).toBe('Achou caro')

  const { default: AxeBuilder } = await import('@axe-core/playwright')
  const r = await new AxeBuilder({ page }).include('main').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})

test('atendimentos: virou cliente abre o caso e leva para a página do cliente', async ({ page }) => {
  const estado = await simularSupabase(page, { leads: structuredClone(leads), clientes })
  await ir(page, '/atendimentos')
  await page.getByLabel('Mover Marcos Antunes para').selectOption('contratou')
  const d = page.getByRole('dialog', { name: 'Virou cliente' })
  await expect(d.getByLabel('Área do caso')).toHaveValue('trabalhista')
  await d.getByRole('button', { name: 'Cadastrar cliente e abrir caso' }).click()
  await expect(page).toHaveURL(/\/clientes\/c1$/)
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_lead_converter')?.corpo).toMatchObject({ p_id: 'ld1', p_area: 'trabalhista', p_produto: null })
})

test('cliente: gera link de acompanhamento, envia pelo WhatsApp e desativa', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes })
  await ir(page, '/clientes/c1')
  const painel = page.getByRole('region', { name: 'Meu Processo (app do cliente)' })
  await painel.getByRole('button', { name: 'Gerar link do Meu Processo' }).click()
  const link = painel.getByLabel('Link do cliente')
  await expect(link).toHaveValue(new RegExp(`/mp/${'f'.repeat(64)}$`))
  const wa = await painel.getByRole('link', { name: 'Enviar pelo WhatsApp' }).getAttribute('href')
  expect(wa).toContain('https://wa.me/5549999110002?text=')
  expect(decodeURIComponent(wa!)).toContain('Olá, Bruno!')
  await painel.getByRole('button', { name: 'Desativar link' }).click()
  await expect(page.getByText('Link desativado. O cliente não consegue mais abrir.')).toBeVisible()
  expect(estado.rpcs.map((x) => x.nome)).toEqual(expect.arrayContaining(['hiadv_portal_gerar', 'hiadv_portal_revogar']))
})

test('cliente: registra horas (manual e com erro claro) e remove', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes, horas: [] })
  await ir(page, '/clientes/c1')
  const painel = page.getByRole('region', { name: 'Horas trabalhadas' })
  await painel.getByLabel('Tempo').fill('abc')
  await painel.getByRole('button', { name: 'Registrar horas' }).click()
  await expect(painel.getByRole('alert')).toContainText('Informe o tempo')
  await painel.getByLabel('Tempo').fill('1h30')
  await painel.getByLabel('O que foi feito (opcional)').fill('Análise do CNIS')
  await painel.getByRole('button', { name: 'Registrar horas' }).click()
  await expect(painel.getByText('1h30 · Análise do CNIS')).toBeVisible()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_horas_lancar')?.corpo.p).toMatchObject({ cliente: 'c1', minutos: 90 })
  await painel.getByRole('button', { name: /Remover 1h30/ }).click()
  await expect(painel.getByText('1h30 · Análise do CNIS')).toBeHidden()
  await painel.getByRole('button', { name: 'Iniciar cronômetro' }).click()
  await expect(painel.getByRole('timer')).toContainText('Contando há 1 min')
  await painel.getByRole('button', { name: 'Parar' }).click()
  await expect(painel.getByLabel('Tempo')).toHaveValue('1')
})

test('página do cliente: abre sem login pelo link e mostra fase e compromissos', async ({ page }) => {
  await simularSupabase(page, {
    portal: {
      escritorio: { nome: 'Silva & Prado Advocacia', whatsapp: '4733330000' }, cliente: 'Bruno', expira_em: '2027-02-19T12:00:00Z',
      casos: [{ area: 'Previdenciário administrativo', fase: 'Aguardando a perícia', desde: '2026-11-10', concluido: false }],
      compromissos: [{ tipo: 'Perícia', quando: '2026-12-02T13:00:00Z', local: 'Agência do INSS de Joaçaba' }],
    },
  })
  await page.goto(`/acompanhar/${'f'.repeat(64)}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Olá, Bruno!' })).toBeVisible()
  await expect(page.getByText('Aguardando a perícia')).toBeVisible()
  await expect(page.getByText('Agência do INSS de Joaçaba')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Falar com o escritório no WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/554733330000\?text=/)
  await expect(page).not.toHaveURL(/login/)
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  const r = await new AxeBuilder({ page }).include('main').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])

  await page.goto(`/acompanhar/${'0'.repeat(64)}`)
  await expect(page.getByRole('heading', { name: 'Este link não está mais valendo' })).toBeVisible()
  await page.goto('/acompanhar/qualquer-coisa')
  await expect(page.getByRole('heading', { name: 'Este link não está mais valendo' })).toBeVisible()
})

test('configurações: agenda no Google gera o link pessoal e o gestor salva o WhatsApp do escritório', async ({ page }) => {
  const estado = await simularSupabase(page)
  await ir(page, '/configuracoes')
  await page.getByRole('navigation', { name: 'Grupos de configuração' }).getByRole('button', { name: /Seu acesso/ }).click()
  await page.getByRole('button', { name: 'Ligar agenda no Google' }).click()
  await expect(page.getByLabel('Seu link de agenda (pessoal)')).toHaveValue(new RegExp(`/functions/v1/agenda\\?t=${'e'.repeat(64)}$`))
  await page.getByRole('navigation', { name: 'Grupos de configuração' }).getByRole('button', { name: /Escritório/ }).click()
  const contato = page.getByRole('region', { name: 'Contato do escritório' })
  await expect(contato.getByLabel('WhatsApp do escritório')).toHaveValue('(47) 3333-0000')
  await contato.getByLabel('WhatsApp do escritório').fill('(49) 99999-1111')
  await contato.getByRole('button', { name: 'Salvar contato' }).click()
  await expect.poll(() => estado.rpcs.find((x) => x.nome === 'hiadv_escritorio_contato_salvar')?.corpo.p_whatsapp).toBe('(49) 99999-1111')
})

test('colaborador também liga a agenda, mas não vê o contato do escritório', async ({ page }) => {
  await simularSupabase(page, { papel: 'colaborador' })
  await ir(page, '/configuracoes')
  await expect(page.getByRole('button', { name: 'Ligar agenda no Google' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Contato do escritório' })).toHaveCount(0)
})
