import { test, expect, type Page } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const VAGA = { id: '11111111-1111-4111-8111-111111111111', slug: 'assistente-de-triagem', escritorio_slug: 'silva-prado-advocacia', status: 'aberta', total: 2, novos: 1, criado_em: '2026-11-20T10:00:00Z',
  funcao: 'triagem', titulo: 'Assistente de triagem documental', regime: 'CLT', modalidade: 'Remoto', jornada: 'Seg. a sex., 8h às 17h', cidade: null, salario: 2300, salario_obs: '+ bonificação por meta',
  mostrar_salario: true, beneficios: ['Vale-alimentação R$ 450', 'Notebook fornecido'], atividades: ['Conferir laudos'], requisitos: ['Ensino médio'], diferenciais: [], perguntas: ['Como você organiza muitos documentos?'], quantidade: 1, inscricoes_ate: null }
const CANDS = [
  { id: 'c1', nome: 'Ana Ferreira', email: 'ana@exemplo.com', whatsapp: '49988887777', cidade: 'Joaçaba', uf: 'SC', linkedin: null, curriculo_path: null, respostas: { 0: 'Por tipo.' }, banco_talentos: true, etapa: 'recebido', nota: null, obs: null, criado_em: '2026-11-25T12:00:00Z' },
  { id: 'c2', nome: 'Bruno Lima', email: 'bruno@exemplo.com', whatsapp: '49977776666', cidade: null, uf: null, linkedin: null, curriculo_path: `${'1'.repeat(8)}/x.pdf`, respostas: {}, banco_talentos: false, etapa: 'entrevista', nota: 4, obs: null, criado_em: '2026-11-24T12:00:00Z' },
]
const PUB = { ...VAGA, escritorio: 'Silva & Prado Advocacia', cidade_escritorio: 'Joaçaba', aberta: true }
const semEstouro = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1)

test('gestor: cria vaga a partir do modelo da função, publica e vê o funil', async ({ page }) => {
  const estado = await simularSupabase(page, { rhVagas: [VAGA], rhCandidatos: CANDS })
  await entrar(page); await page.waitForURL(/seu-dia/)
  await page.goto('/recrutamento')
  await expect(page.getByRole('heading', { level: 1, name: 'Recrutamento' })).toBeVisible()
  await page.getByRole('button', { name: 'Nova vaga' }).click()
  const d = page.getByRole('dialog', { name: 'Nova vaga' })
  await expect(d.getByLabel('Cargo')).toHaveValue('Assistente de triagem documental')
  await d.getByLabel('Função').selectOption('juridico')
  await expect(d.getByLabel('Cargo')).toHaveValue('Advogado(a) previdenciário(a)')
  await d.getByLabel('Cargo').fill('abc')
  await d.getByRole('button', { name: 'Salvar vaga' }).click()
  await expect(d.getByRole('alert')).toContainText('entre 4 e 100')
  await d.getByLabel('Cargo').fill('Advogada previdenciária júnior')
  await d.getByLabel('Salário (R$)').fill('4.500,50')
  await d.getByLabel(/Benefícios/).fill('Plano de saúde\n\nNotebook')
  await d.getByRole('button', { name: 'Salvar vaga' }).click()
  await expect(d).toBeHidden()
  const corpo = estado.rpcs.find((x) => x.nome === 'rh_vaga_salvar')?.corpo.p as Record<string, unknown>
  expect(corpo).toMatchObject({ funcao: 'juridico', titulo: 'Advogada previdenciária júnior', salario: 4500.5, beneficios: ['Plano de saúde', 'Notebook'] })
  // funil
  await page.getByRole('button', { name: /Assistente de triagem documental/ }).click()
  await expect(page.getByRole('listitem', { name: 'Recebidos: 1' })).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'Entrevista: 1' })).toContainText('Bruno Lima')
  await page.getByRole('button', { name: /Ana Ferreira/ }).click()
  const f = page.getByRole('dialog', { name: 'Ana Ferreira' })
  await expect(f.getByText('Por tipo.')).toBeVisible()
  await f.getByRole('button', { name: 'Nota 5' }).click()
  await f.getByLabel('Etapa').selectOption('triagem')
  await expect.poll(() => estado.rpcs.filter((x) => x.nome === 'rh_candidatura_atualizar').length).toBe(2)
  await f.getByRole('button', { name: 'Apagar a pedido do candidato' }).click()
  await expect(f.getByRole('alert')).toContainText('Não dá para desfazer')
  await semEstouro(page)
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  const r = await new AxeBuilder({ page }).include('[role=dialog]').analyze()
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])
})

test('colaborador vê as vagas mas não cria nem move', async ({ page }) => {
  await simularSupabase(page, { papel: 'colaborador', rhVagas: [VAGA], rhCandidatos: CANDS })
  await entrar(page); await page.waitForURL(/seu-dia/)
  await page.goto('/recrutamento')
  await expect(page.getByRole('button', { name: /Assistente de triagem documental/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nova vaga' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
  await page.getByRole('button', { name: /Assistente de triagem documental/ }).click()
  await page.getByRole('button', { name: /Ana Ferreira/ }).click()
  await expect(page.getByText('Só o gestor move candidatos.')).toBeVisible()
})

test('sem vagas: estado vazio orienta o gestor', async ({ page }) => {
  await simularSupabase(page, { rhVagas: [] })
  await entrar(page); await page.waitForURL(/seu-dia/)
  await page.goto('/recrutamento')
  await expect(page.getByText('Nenhuma vaga criada.')).toBeVisible()
  await expect(page.getByText(/Toque em Nova vaga/)).toBeVisible()
})

test('página pública: anúncio com salário e benefícios, inscrição validada com currículo', async ({ page }) => {
  const estado = await simularSupabase(page, { rhPublica: PUB })
  await page.goto('/vagas/silva-prado-advocacia/assistente-de-triagem')
  await expect(page.getByRole('heading', { level: 1, name: 'Assistente de triagem documental' })).toBeVisible()
  await expect(page.getByText(/R\$\s2\.300,00/)).toBeVisible()
  await expect(page.getByText('Vale-alimentação R$ 450')).toBeVisible()
  await semEstouro(page)
  await page.getByRole('button', { name: 'Candidatar-se' }).click()
  await page.getByLabel('Nome completo').fill('Carla')
  await page.getByRole('button', { name: 'Enviar inscrição' }).click()
  await expect(page.getByRole('alert')).toContainText('nome completo')
  await page.getByLabel('Nome completo').fill('Carla Souza')
  await page.getByLabel('E-mail').fill('carla@exemplo.com')
  await page.getByLabel('WhatsApp').fill('(49) 98888-1111')
  await page.getByLabel(/Currículo em PDF/).setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('x') })
  await expect(page.getByRole('alert')).toContainText('PDF')
  await page.getByLabel(/Currículo em PDF/).setInputFiles({ name: 'cv.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste') })
  await page.getByRole('button', { name: 'Enviar inscrição' }).click()
  await expect(page.getByRole('alert')).toContainText('Responda as perguntas')
  await page.getByLabel('Como você organiza muitos documentos?').fill('Por prazo e tipo.')
  await page.getByRole('button', { name: 'Enviar inscrição' }).click()
  await expect(page.getByRole('alert')).toContainText('aceitar o uso dos dados')
  await page.getByLabel(/use estes dados só para este processo/).check()
  await page.getByRole('button', { name: 'Enviar inscrição' }).click()
  await expect(page.getByRole('heading', { name: 'Inscrição recebida.' })).toBeVisible()
  expect(estado.uploads.some((u) => /^curriculos\/11111111-1111-4111-8111-111111111111\/[0-9a-f-]{36}\.pdf$/.test(u))).toBe(true)
  const corpo = estado.rpcs.find((x) => x.nome === 'rh_candidatura_enviar')?.corpo.p as Record<string, unknown>
  expect(corpo).toMatchObject({ vaga: VAGA.id, nome: 'Carla Souza', consentimento: true, banco_talentos: false, respostas: { 0: 'Por prazo e tipo.' } })
  expect(Object.keys(corpo)).not.toContain('idade')
})

test('página pública: erro do servidor aparece e a inscrição pode ser refeita', async ({ page }) => {
  await simularSupabase(page, { rhPublica: { ...PUB, perguntas: [] }, rhErroEnvio: 'Já recebemos uma inscrição com este e-mail para esta vaga.' })
  await page.goto('/vagas/silva-prado-advocacia/assistente-de-triagem')
  await page.getByRole('button', { name: 'Candidatar-se' }).click()
  await page.getByLabel('Nome completo').fill('Carla Souza')
  await page.getByLabel('E-mail').fill('carla@exemplo.com')
  await page.getByLabel('WhatsApp').fill('49988881111')
  await page.getByLabel(/use estes dados só para este processo/).check()
  await page.getByRole('button', { name: 'Enviar inscrição' }).click()
  await expect(page.getByRole('alert')).toContainText('Já recebemos')
  await expect(page.getByRole('button', { name: 'Enviar inscrição' })).toBeEnabled()
})

test('página pública: vaga encerrada não aceita inscrição e endereço errado avisa', async ({ page }) => {
  await simularSupabase(page, { rhPublica: { ...PUB, aberta: false, salario: null } })
  await page.goto('/vagas/silva-prado-advocacia/assistente-de-triagem')
  await expect(page.getByText('não está recebendo inscrições')).toBeVisible()
  await expect(page.getByText('A combinar')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Candidatar-se' })).toHaveCount(0)
  await simularSupabase(page, { rhPublica: null })
  await page.goto('/vagas/x/y')
  await expect(page.getByRole('heading', { name: 'Vaga não encontrada' })).toBeVisible()
})

test('manuais do Coder: só o code abre, com busca e checklist da implantação', async ({ page }) => {
  await simularSupabase(page, { papel: 'code' })
  await entrar(page); await page.waitForURL(/seu-dia/)
  await page.goto('/central/manuais')
  await expect(page.getByRole('heading', { level: 1, name: 'Manuais do Coder' })).toBeVisible()
  await page.getByLabel('Buscar no manual').fill('service_role')
  await expect(page.getByText(/service_role do Supabase nunca/)).toBeVisible()
  await page.getByRole('button', { name: 'Implantação em 6 semanas' }).click()
  await page.getByLabel('Buscar no manual').fill('')
  for (let i = 1; i <= 6; i++) await expect(page.getByRole('heading', { name: new RegExp(`^Semana ${i} ·`) })).toBeVisible()
  const item = page.getByLabel(/Reunião de diagnóstico/)
  await item.check(); await page.reload()
  await page.getByRole('button', { name: 'Implantação em 6 semanas' }).click()
  await expect(page.getByLabel(/Reunião de diagnóstico/)).toBeChecked()
  await semEstouro(page)
})

test('manuais do Coder: master não abre', async ({ page }) => {
  await simularSupabase(page, { papel: 'master' })
  await entrar(page); await page.waitForURL(/seu-dia/)
  await page.goto('/central/manuais')
  await expect(page.getByText('Esta tela é da administração do HiAdv.')).toBeVisible()
})
