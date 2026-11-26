import { describe, expect, it } from 'vitest'
import { ETAPAS, MODELOS, agruparPorEtapa, linkVaga, listaDeTexto, salarioTela, textoDivulgacao, validarCandidatura, validarCurriculo, validarVaga, vagaVazia, type Candidatura, type FormCandidatura } from '../../src/data/recrutamento'

const ok: FormCandidatura = { nome: 'Ana Ferreira', email: 'ana@exemplo.com', whatsapp: '(49) 98888-7777', cidade: 'Joaçaba', uf: 'SC', linkedin: '', respostas: { 0: 'Resposta' }, consentimento: true, bancoTalentos: false }
const c = (id: string, etapa: Candidatura['etapa']): Candidatura => ({ id, nome: id, email: `${id}@x.com`, whatsapp: '49999999999', cidade: null, uf: null, linkedin: null, curriculoPath: null, respostas: {}, bancoTalentos: false, etapa, nota: null, obs: null, criadoEm: '' })

describe('vaga', () => {
  it('cada função tem modelo com atividades e perguntas (menos "outra")', () => {
    for (const f of ['comercial', 'triagem', 'juridico', 'suporte'] as const) { expect(MODELOS[f].titulo.length).toBeGreaterThan(3); expect(MODELOS[f].atividades.length).toBeGreaterThan(0); expect(MODELOS[f].perguntas.length).toBeGreaterThan(0) }
    expect(vagaVazia('outra').titulo).toBe('')
  })
  it.each([
    [{ titulo: 'abc' }, 'O cargo precisa ter entre 4 e 100 caracteres.'],
    [{ titulo: 'x'.repeat(101) }, 'O cargo precisa ter entre 4 e 100 caracteres.'],
    [{ salario: -1 }, 'Salário inválido.'], [{ salario: Number.NaN }, 'Salário inválido.'], [{ salario: 2_000_000 }, 'Salário inválido.'],
    [{ inscricoesAte: '2026-01-01' }, 'A data final das inscrições já passou.'],
    [{ quantidade: 0 }, 'A quantidade de vagas vai de 1 a 50.'], [{ quantidade: 51 }, 'A quantidade de vagas vai de 1 a 50.'],
    [{ beneficios: Array(21).fill('a') }, 'Cada lista pode ter no máximo 20 itens.'],
    [{ requisitos: ['x'.repeat(301)] }, 'Cada item pode ter no máximo 300 caracteres.'],
  ])('recusa %o', (mud, msg) => { expect(validarVaga({ ...vagaVazia(), ...mud }, '2026-11-26')).toBe(msg) })
  it('aceita vaga do modelo, salário zero e data de hoje', () => {
    expect(validarVaga(vagaVazia(), '2026-11-26')).toBeNull()
    expect(validarVaga({ ...vagaVazia(), salario: 0, inscricoesAte: '2026-11-26' }, '2026-11-26')).toBeNull()
  })
})

describe('candidatura', () => {
  it.each([
    [{ nome: 'Ana' }, 'Informe o nome completo.'], [{ nome: 'Anaferreira' }, 'Informe o nome completo.'], [{ nome: '   ' }, 'Informe o nome completo.'],
    [{ email: 'ana@' }, 'E-mail inválido.'], [{ email: 'ana exemplo.com' }, 'E-mail inválido.'],
    [{ whatsapp: '9999' }, 'WhatsApp inválido. Use DDD e número.'], [{ whatsapp: '5549999999999999' }, 'WhatsApp inválido. Use DDD e número.'],
    [{ linkedin: 'https://facebook.com/ana' }, 'O LinkedIn precisa ser um endereço linkedin.com.'],
    [{ respostas: {} }, 'Responda as perguntas da vaga.'], [{ respostas: { 0: '   ' } }, 'Responda as perguntas da vaga.'],
    [{ respostas: { 0: 'x'.repeat(1501) } }, 'Cada resposta pode ter até 1.500 caracteres.'],
    [{ consentimento: false }, 'É preciso aceitar o uso dos dados para participar.'],
  ])('recusa %o', (mud, msg) => { expect(validarCandidatura({ ...ok, ...mud }, ['Pergunta'])).toBe(msg) })
  it('aceita WhatsApp com +55, LinkedIn br e sem perguntas', () => {
    expect(validarCandidatura({ ...ok, whatsapp: '+55 49 98888-7777', linkedin: 'https://br.linkedin.com/in/ana' }, ['P'])).toBeNull()
    expect(validarCandidatura({ ...ok, respostas: {} }, [])).toBeNull()
  })
  it.each([
    [{ type: 'image/png', size: 10, name: 'cv.png' }, 'Envie o currículo em PDF.'],
    [{ type: 'application/pdf', size: 6 * 1024 * 1024, name: 'cv.pdf' }, 'O currículo pode ter até 5 MB.'],
    [{ type: 'application/pdf', size: 0, name: 'cv.pdf' }, 'O arquivo está vazio.'],
    [{ type: '', size: 100, name: 'CV.PDF' }, null], [{ type: 'application/pdf', size: 5 * 1024 * 1024, name: 'a.pdf' }, null],
  ])('currículo %o', (a, msg) => { expect(validarCurriculo(a)).toBe(msg) })
})

describe('funil e divulgação', () => {
  it('agrupa em todas as 8 etapas, inclusive vazias', () => {
    const g = agruparPorEtapa([c('a', 'recebido'), c('b', 'entrevista'), c('d', 'recebido')])
    expect(Object.keys(g)).toEqual(ETAPAS.map((e) => e.id)); expect(g.recebido.map((x) => x.id)).toEqual(['a', 'd']); expect(g.proposta).toEqual([])
  })
  it('link só existe com endereço do escritório', () => {
    expect(linkVaga('https://hiadv.com.br/', 'lanhi-advogados', 'triagem')).toBe('https://hiadv.com.br/vagas/lanhi-advogados/triagem')
    expect(linkVaga('https://hiadv.com.br', null, 'triagem')).toBeNull()
  })
  it('texto para redes respeita salário oculto e formata data', () => {
    const v = { ...vagaVazia(), salario: 2300, beneficios: ['VA'], inscricoesAte: '2026-12-12' }
    const t = textoDivulgacao({ ...v, mostrarSalario: true }, 'Lanhi Advogados', 'L')
    expect(t).toMatch(/R\$\s2\.300,00/); expect(t).toContain('12/12/2026'); expect(t).toContain('Inscreva-se: L')
    expect(textoDivulgacao({ ...v, mostrarSalario: false }, 'X', 'L')).not.toContain('Salário')
  })
  it('lista de texto ignora linhas vazias', () => { expect(listaDeTexto(' a \n\n b\n ')).toEqual(['a', 'b']); expect(salarioTela(null)).toBeNull() })
})
