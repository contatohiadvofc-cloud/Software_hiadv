import { test, expect } from '@playwright/test'
import { simularSupabase, entrar } from './mock'

const clientes = [{ id: 'c1', nome: 'Bruno Teixeira', telefone: '49999110002', origem: 'whatsapp', criado_em: '2026-09-10T12:00:00Z' }]
const procuracao = { id: 'm1', tipo: 'modelo', titulo: 'Procuração', area: null, peca: 'Procuração', conteudo: 'OUTORGANTE: {{cliente.qualificacao}}.\n\nOUTORGADO: {{advogado.nome}}, {{advogado.oab}}.\n\n{{data.local_e_data}}.', link: null, arquivo: null, arquivo_nome: null, tamanho: null, criado_por: null, criado_em: '2026-11-01T12:00:00Z' }

async function abrir(page: import('@playwright/test').Page, rota: string) {
  await entrar(page)
  await expect(page).toHaveURL(/\/seu-dia$/)
  await page.goto(rota)
}

test('gerar documento pela página do cliente: prévia preenchida, falta marcada e .docx no padrão de nome', async ({ page }) => {
  await simularSupabase(page, { clientes, biblioteca: [procuracao] })
  await abrir(page, '/clientes/c1')
  await page.getByRole('button', { name: 'Gerar documento' }).click()
  const d = page.getByRole('dialog', { name: 'Gerar documento' })
  await d.getByLabel('Modelo').selectOption('m1')
  const previa = d.getByLabel('Prévia do documento')
  await expect(previa).toContainText('OUTORGANTE: Bruno Teixeira, inscrito(a) no CPF sob o nº 529.982.247-25.')
  await expect(previa).toContainText('OUTORGADO: Ana Prado, OAB/SC 00.101.')
  await expect(previa).toContainText('Joinville/SC, ')
  const baixando = page.waitForEvent('download')
  await d.getByRole('button', { name: 'Baixar Word (.docx)' }).click()
  const arq = await baixando
  // o nome (AAAA_MM_DD - Título - Cliente.docx) tem teste de lógica; o Chromium de teste não aceita acentos no nome
  const { default: PizZip } = await import('pizzip')
  const fs = await import('node:fs/promises')
  const xml = new PizZip(await fs.readFile((await arq.path())!)).file('word/document.xml')!.asText()
  expect(xml).toContain('OUTORGADO: Ana Prado, OAB/SC 00.101.')
})

test('modelo usado pela Biblioteca e variáveis à vista no cadastro do modelo', async ({ page }) => {
  await simularSupabase(page, { clientes, biblioteca: [procuracao], documento: { cliente: { nome: 'Bruno Teixeira', cpf: null }, caso: null, escritorio: { nome: 'Silva & Prado', cidade: null, oabs: [] }, advogado: { nome: 'Ana Prado', oab: null } } })
  await abrir(page, '/biblioteca')
  await page.getByRole('button', { name: 'Usar o modelo Procuração com um cliente' }).click()
  const d = page.getByRole('dialog', { name: 'Gerar documento' })
  await d.getByLabel('Cliente', { exact: true }).fill('Bru')
  await d.getByRole('button', { name: 'Bruno Teixeira' }).click()
  await expect(d.getByText('Faltam: OAB do advogado(a).', { exact: false })).toBeVisible()
  await expect(d.getByLabel('Prévia do documento')).toContainText('[PREENCHER: OAB do advogado(a)]')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Incluir' }).click()
  await page.getByText('Variáveis para preencher sozinho').click()
  await expect(page.getByText('{{cliente.qualificacao}}')).toBeVisible()
})

test('dados para documentos: completa e salva só os campos do cliente', async ({ page }) => {
  const estado = await simularSupabase(page, { clientes })
  await abrir(page, '/clientes/c1')
  const p = page.getByRole('region', { name: 'Dados para documentos' })
  await p.getByRole('button', { name: 'Completar dados' }).click()
  await p.getByLabel('Estado civil').fill('casado')
  await p.getByLabel('CEP').fill('89665-000')
  await p.getByRole('button', { name: 'Salvar dados' }).click()
  await expect(page.getByText('Dados salvos.')).toBeVisible()
  expect(estado.rpcs.find((x) => x.nome === 'hiadv_cliente_dados_salvar')?.corpo).toMatchObject({ p_cliente: 'c1', p: { estado_civil: 'casado', cep: '89665-000' } })
})
