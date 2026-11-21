import { Document, Packer, Paragraph, TextRun } from 'docx'
import PizZip from 'pizzip'
import { docxDeModelo, docxDeTexto } from '../../src/lib/docx'

async function modelo(texto: string): Promise<ArrayBuffer> {
  const b = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun(texto)] })] }] }))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}
const xml = async (blob: Blob) => new PizZip(await blob.arrayBuffer()).file('word/document.xml')!.asText()

describe('geração de .docx', () => {
  it('preenche o modelo do escritório e marca o que falta', async () => {
    const r = await docxDeModelo(await modelo('Outorgante: {{cliente.nome}}, RG {{ cliente.rg }}. {{x.y}}'), { 'cliente.nome': 'Maria Ficticia', 'cliente.rg': '' })
    const t = await xml(r.blob)
    expect(t).toContain('Outorgante: Maria Ficticia, RG [PREENCHER: RG]. {{x.y}}')
    expect(r.faltando).toEqual(['RG'])
  })
  it('monta .docx a partir de texto com parágrafos', async () => {
    const blob = await docxDeTexto('Primeiro parágrafo.\n\nSegundo\ncom quebra.')
    const t = await xml(blob)
    expect(t).toContain('Primeiro parágrafo.')
    expect(new PizZip(await blob.arrayBuffer()).file('word/styles.xml')!.asText()).toContain('Cambria')
    expect((t.match(/<w:p[ >]/g) ?? []).length).toBe(2)
  })
})
