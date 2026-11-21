import { diferencas, etapaDeExigencia, prazoInterno, protocoloDoCaso, textoEvento, validarExigencia, validarProtocolo, valorParaEdicao } from '../../src/data/ficha'
import type { CampoDef } from '../../src/data/campos'

const defs: CampoDef[] = [
  { chave: 'vara', rotulo: 'Vara', tipo: 'texto', opcoes: null, ordem: 1, noCartao: true },
  { chave: 'salario', rotulo: 'Salário', tipo: 'moeda', opcoes: null, ordem: 2, noCartao: false },
]

describe('diferencas', () => {
  it('manda só o que mudou', () => {
    expect(diferencas(defs, { vara: '1ª Vara', salario: 2000 }, { vara: '1ª Vara', salario: '2500' })).toEqual({ salario: '2500' })
  })
  it('limpar um campo manda vazio', () => {
    expect(diferencas(defs, { vara: '1ª Vara' }, { vara: '  ' })).toEqual({ vara: '' })
  })
  it('ignora chave que não é da área', () => {
    expect(diferencas(defs, {}, { outra: 'x' } as Record<string, string>)).toEqual({})
  })
})

describe('textoEvento', () => {
  it('mostra o nome do agente', () => {
    expect(textoEvento({ evento: 'agente', de: 'Acompanhamento', para: 'protocolado', detalhe: 'Agendou retorno para 25/11/2026', quem: 'sistema', em: '' })).toBe('Acompanhamento: Agendou retorno para 25/11/2026')
  })
  it('descreve mudança de etapa', () => {
    expect(textoEvento({ evento: 'status', de: 'pendente', para: 'protocolado', detalhe: null, quem: null, em: '' })).toBe('Mudou de “pendente” para “protocolado”')
  })
  it('usa o detalhe quando existe', () => {
    expect(textoEvento({ evento: 'campos', de: null, para: null, detalhe: 'Atualizou: Vara', quem: null, em: '' })).toBe('Atualizou: Vara')
  })
})

describe('moeda na edição', () => {
  it('mostra com vírgula e não reenvia valor igual', () => {
    expect(valorParaEdicao(defs[1], 3150)).toBe('3150,00')
    expect(diferencas(defs, { salario: 3150 }, { salario: '3150,00' })).toEqual({})
    expect(diferencas(defs, { salario: 3150 }, { salario: '3.200,50' })).toEqual({ salario: '3200.50' })
  })
})

describe('andamento: protocolo, exigência e via', () => {
  const hoje = '2026-11-21'
  it('confere o protocolo por via', () => {
    expect(validarProtocolo('administrativo', '', hoje, hoje)).toMatch(/número/)
    expect(validarProtocolo('administrativo', '1234567', '2026-11-25', hoje)).toMatch(/futura/)
    expect(validarProtocolo('administrativo', '1234567', '', hoje)).toMatch(/data/)
    expect(validarProtocolo('judicial', '1234567', hoje, hoje)).toMatch(/CNJ/)
    expect(validarProtocolo('judicial', '5001234-56.2026.4.04.7203', hoje, hoje)).toBeNull()
    expect(validarProtocolo('trabalhista', 'ATOrd 0001', '2026-11-20', hoje)).toBeNull()
  })
  it('acha o protocolo nos campos ou no benefício', () => {
    expect(protocoloDoCaso({ campos: { protocolo_numero: '123', protocolo_data: '2026-11-20' }, beneficio: null, numeroCnj: null })).toEqual({ numero: '123', data: '2026-11-20' })
    expect(protocoloDoCaso({ campos: {}, beneficio: { protocolo_adm: '987' }, numeroCnj: null })).toEqual({ numero: '987', data: null })
    expect(protocoloDoCaso({ campos: {}, beneficio: null, numeroCnj: null })).toBeNull()
  })
  it('escolhe a etapa de exigência que não é final', () => {
    expect(etapaDeExigencia([{ status: 'protocolado', ordem: 1, final: false, pedeMotivo: false }, { status: 'exigência', ordem: 2, final: false, pedeMotivo: false }])).toBe('exigência')
    expect(etapaDeExigencia([{ status: 'pendente', ordem: 1, final: false, pedeMotivo: false }])).toBeNull()
  })
  it('valida a exigência e prevê o prazo interno em dias úteis', () => {
    expect(validarExigencia({ descricao: '', prazoFatal: '2026-12-01', folga: 2, responsavel: null }, hoje)).toMatch(/Descreva/)
    expect(validarExigencia({ descricao: 'Laudo', prazoFatal: '2026-11-20', folga: 2, responsavel: null }, hoje)).toMatch(/passou/)
    expect(validarExigencia({ descricao: 'Laudo', prazoFatal: '2026-12-01', folga: 11, responsavel: null }, hoje)).toMatch(/folga/)
    expect(validarExigencia({ descricao: 'Laudo', prazoFatal: '2026-12-01', folga: 2, responsavel: null }, hoje)).toBeNull()
    // terça 01/12 menos 2 dias úteis = sexta 27/11
    expect(prazoInterno('2026-12-01', 2, hoje)).toBe('2026-11-27')
    // nunca antes de hoje
    expect(prazoInterno('2026-11-23', 5, hoje)).toBe(hoje)
  })
  it('descreve os novos eventos no histórico', () => {
    expect(textoEvento({ evento: 'marco', de: 'protocolo', para: '2026-11-20', detalhe: '123', quem: null, em: '' })).toBe('Protocolo registrado: 123')
    expect(textoEvento({ evento: 'exigencia', de: null, para: '2026-12-01', detalhe: 'Laudo', quem: null, em: '' })).toBe('Exigência registrada (prazo fatal 01/12/2026): Laudo')
    expect(textoEvento({ evento: 'via', de: 'administrativo', para: 'judicial', detalhe: 'Caso novo aberto em judicial · Indeferido', quem: null, em: '' })).toBe('Aberto um caso novo na via “judicial” (Indeferido)')
  })
})
