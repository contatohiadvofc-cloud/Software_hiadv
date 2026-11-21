import { dataExtenso, mapaDeValores, nomeArquivo, preencher, qualificacao, type DadosDocumento } from '../../src/data/modelos'

const dados: DadosDocumento = {
  cliente: { nome: 'Maria Ficticia', cpf: '52998224725', nacionalidade: 'brasileira', estado_civil: 'casada', profissao: 'costureira', endereco: 'Rua A, 10', cidade: 'Capinzal', uf: 'SC', cep: '89665000' },
  caso: { area: 'administrativo', produto: 'auxilio_acidente', nb: null, dib: '2026-03-01', dcb: null, data_acidente: null, causa_acidente: null, sequela: null, profissao_epoca: null, uf: null, relato: null, processo: '50023588220264047212' },
  escritorio: { nome: 'Silva & Prado', cidade: 'Joinville/SC', oabs: null },
  advogado: { nome: 'Ana Prado', oab: 'OAB/SC 00.101' },
}

describe('modelos preenchidos', () => {
  it('monta a qualificação sem as partes que faltam', () => {
    expect(qualificacao(dados.cliente)).toBe('Maria Ficticia, brasileira, casada, costureira, inscrito(a) no CPF sob o nº 529.982.247-25, residente e domiciliado(a) em Rua A, 10, Capinzal/SC, CEP 89665-000')
  })
  it('preenche e marca o que falta, sem mexer no que não conhece', () => {
    const v = mapaDeValores(dados, '2026-11-21')
    const r = preencher('{{cliente.nome}}, CPF {{ cliente.cpf }}, RG {{cliente.rg}}, {{caso.beneficio}} desde {{caso.dib}} ({{caso.processo}}). {{data.local_e_data}}. {{outra.coisa}}', v)
    expect(r.texto).toBe('Maria Ficticia, CPF 529.982.247-25, RG [PREENCHER: RG], Auxílio-acidente desde 01/03/2026 (5002358-82.2026.4.04.7212). Joinville/SC, 21 de novembro de 2026. {{outra.coisa}}')
    expect(r.faltando).toEqual(['RG'])
    expect(r.desconhecidas).toEqual(['outra.coisa'])
  })
  it('data por extenso e nome do arquivo no padrão do escritório', () => {
    expect(dataExtenso('2026-01-05')).toBe('5 de janeiro de 2026')
    expect(nomeArquivo('Procuração / INSS', 'Maria Ficticia', '2026-11-21')).toBe('2026_11_21 - Procuração INSS - Maria Ficticia.docx')
  })
})
