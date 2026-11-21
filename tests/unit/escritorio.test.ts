import { faltasDoAgente, nomeArquivoSeguro, tamanhoTela, validarArquivo, type Agente, type Integracao } from '../../src/data/escritorio'

const redatora: Agente = { agente: 'redatora', nome: 'Redatora', descricao: '', areas: null, precisa: ['claude', 'relato', 'modelo'], usaModelo: true, ativo: false, etapas: [], modeloId: null, modeloTitulo: null }
const claude = (ativo: boolean, temChave: boolean): Integracao => ({ servico: 'claude', ativo, modo: null, limiteMensal: null, temChave, chaveFinal: null, configuradoEm: null, configuradoPor: null })

describe('escritorio', () => {
  it('diz o que falta para ligar o agente', () => {
    expect(faltasDoAgente(redatora, [claude(false, true)], null)).toEqual(['Ativar a Claude em Integrações', 'Escolher o modelo da Biblioteca'])
    expect(faltasDoAgente(redatora, [claude(true, true)], 'm1')).toEqual([])
  })
  it('nome de arquivo seguro', () => {
    expect(nomeArquivoSeguro('Petição inicial — auxílio (1).docx')).toBe('Peticao_inicial_auxilio_1_.docx')
  })
  it('valida arquivo', () => {
    expect(validarArquivo({ name: 'modelo.docx', size: 1000 })).toBeNull()
    expect(validarArquivo({ name: 'foto.exe', size: 10 })).toBe('Envie Word, PDF, ODT, RTF ou texto.')
    expect(validarArquivo({ name: 'g.pdf', size: 30 * 1024 * 1024 })).toBe('O arquivo passa de 25 MB.')
  })
  it('tamanho legível', () => expect(tamanhoTela(2.5 * 1024 * 1024)).toBe('2,5 MB'))
})
