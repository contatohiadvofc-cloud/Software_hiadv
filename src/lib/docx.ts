/** Geração de .docx no próprio aparelho (nada sai do navegador). Carregado só quando alguém gera um documento. */
import { MARCA_FALTA, VARIAVEIS } from '../data/modelos'

const rotuloDe = (k: string) => VARIAVEIS.find((v) => v.chave === k)?.rotulo ?? k
const cm = (v: number) => Math.round((v / 2.54) * 1440)

/** Texto simples (parágrafos separados por linha em branco) → .docx em Cambria 12, entrelinha 1,15, A4. */
export async function docxDeTexto(texto: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun } = await import('docx')
  const paragrafos = texto.replace(/\r\n?/g, '\n').split(/\n{2,}/).map((bloco) => new Paragraph({
    spacing: { line: 276, before: 0, after: 240 },
    children: bloco.split('\n').flatMap((linha, i) => [...(i > 0 ? [new TextRun({ break: 1 })] : []), new TextRun({ text: linha })]),
  }))
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Cambria', size: 24 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: cm(3), left: cm(3), right: cm(2), bottom: cm(2) } } }, children: paragrafos }],
  })
  return Packer.toBlob(doc)
}

/** Modelo .docx do escritório com {{variáveis}} → .docx preenchido, mantendo a formatação original. */
export async function docxDeModelo(modelo: ArrayBuffer, valores: Record<string, string>): Promise<{ blob: Blob; faltando: string[] }> {
  const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([import('pizzip'), import('docxtemplater')])
  const faltando = new Set<string>()
  const doc = new Docxtemplater(new PizZip(modelo), {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
    parser: (tag: string) => {
      const k = tag.trim().toLowerCase()
      return { get: () => {
        if (!(k in valores)) return `{{${tag}}}`
        if (!valores[k]) { faltando.add(rotuloDe(k)); return MARCA_FALTA(rotuloDe(k)) }
        return valores[k]
      } }
    },
  })
  doc.render({})
  const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }) as Blob
  return { blob, faltando: [...faltando] }
}

export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nome; a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a); a.click()
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url) }, 30_000)
}
