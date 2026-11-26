/** ZIP simples (sem compressão), feito no navegador: um arquivo por tabela, abre no Windows, Mac e celular. */
const TABELA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
export function crc32(dados: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < dados.length; i++) c = TABELA_CRC[(c ^ dados[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export type ArquivoZip = { nome: string; conteudo: string | Uint8Array }

export function montarZip(arquivos: ArquivoZip[], agora = new Date()): Uint8Array {
  const enc = new TextEncoder()
  const hora = ((agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1)) & 0xffff
  const data = (((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate()) & 0xffff
  const partes: Uint8Array[] = []; const central: Uint8Array[] = []; let pos = 0
  for (const a of arquivos) {
    const nome = enc.encode(a.nome)
    const dados = typeof a.conteudo === 'string' ? enc.encode(a.conteudo) : a.conteudo
    const crc = crc32(dados)
    const loc = new DataView(new ArrayBuffer(30))
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true); loc.setUint16(8, 0, true)
    loc.setUint16(10, hora, true); loc.setUint16(12, data, true); loc.setUint32(14, crc, true)
    loc.setUint32(18, dados.length, true); loc.setUint32(22, dados.length, true); loc.setUint16(26, nome.length, true); loc.setUint16(28, 0, true)
    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true); cen.setUint16(10, 0, true)
    cen.setUint16(12, hora, true); cen.setUint16(14, data, true); cen.setUint32(16, crc, true); cen.setUint32(20, dados.length, true); cen.setUint32(24, dados.length, true)
    cen.setUint16(28, nome.length, true); cen.setUint32(42, pos, true)
    partes.push(new Uint8Array(loc.buffer), nome, dados)
    central.push(new Uint8Array(cen.buffer), nome)
    pos += 30 + nome.length + dados.length
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0)
  const fim = new DataView(new ArrayBuffer(22))
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true)
  fim.setUint32(12, tamCentral, true); fim.setUint32(16, pos, true)
  const tudo = [...partes, ...central, new Uint8Array(fim.buffer)]
  const out = new Uint8Array(tudo.reduce((s, p) => s + p.length, 0)); let i = 0
  for (const p of tudo) { out.set(p, i); i += p.length }
  return out
}
