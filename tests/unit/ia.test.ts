import PizZip from 'pizzip'
import { limparResposta, montarPedidoIA, LIMITE_TEXTO } from '../../src/data/iaPrompts'
import { configCompleta, nomeArquivo, textoDeDocx } from '../../src/lib/drive'

describe('IA: pedido', () => {
  it('quesitos levam os dados do caso e as regras de rascunho', () => {
    const { sistema, mensagem } = montarPedidoIA({ acao: 'quesitos', caso: { cliente: 'Rita Moura', 'benefício': 'Auxílio-acidente', vazio: '' }, instrucao: 'Magarefe na época.' })
    expect(sistema).toMatch(/rascunho para o advogado revisar/)
    expect(sistema).toMatch(/Nunca invente/)
    expect(mensagem).toMatch(/profissão exercida na época do fato/)
    expect(mensagem).toContain('- cliente: Rita Moura')
    expect(mensagem).not.toContain('vazio')
  })
  it('pede o essencial', () => {
    expect(() => montarPedidoIA({ acao: 'minuta' })).toThrow(/qual peça/)
    expect(() => montarPedidoIA({ acao: 'resumo_documento' })).toThrow(/Cole o texto/)
    expect(() => montarPedidoIA({ acao: '__proto__' as never, texto: 'x' })).toThrow(/desconhecida/)
  })
  it('corta textos grandes e arquivos que não cabem', () => {
    const grande = 'a'.repeat(LIMITE_TEXTO + 10)
    const { mensagem } = montarPedidoIA({ acao: 'resumo_documento', texto: grande, arquivos: [{ nome: 'laudo.pdf', texto: 'b' }] })
    expect(mensagem).toContain('[texto cortado por tamanho]')
    expect(mensagem).toContain('[outros arquivos não couberam no pedido]')
  })
  it('a resposta não traz código', () => {
    expect(limparResposta('Antes\n```js\nalert(1)\n```\nDepois')).toBe('Antes\n[trecho removido]\nDepois')
  })
})

describe('Drive', () => {
  it('configuração completa só com os três identificadores no formato certo', () => {
    expect(configCompleta({ clientId: '123-abc.apps.googleusercontent.com', apiKey: 'AIza' + 'x'.repeat(35), appId: '123456789' })).toBe(true)
    expect(configCompleta({ clientId: '123', apiKey: 'AIza', appId: '1' })).toBe(false)
    expect(configCompleta(null)).toBe(false)
  })
  it('nome do arquivo com data invertida e sem caracteres proibidos', () => {
    expect(nomeArquivo('Quesitos / rascunho', 'Rita: Moura', new Date(2026, 10, 21))).toBe('2026_11_21 - Quesitos rascunho - Rita Moura')
  })
  it('lê o texto de um .docx', async () => {
    const zip = new PizZip()
    zip.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>Laudo &amp; exame</w:t></w:r></w:p><w:p><w:r><w:t>Joelho</w:t></w:r></w:p></w:body></w:document>')
    const bytes = zip.generate({ type: 'arraybuffer' })
    expect(await textoDeDocx(bytes)).toBe('Laudo & exame\nJoelho')
  })
})
