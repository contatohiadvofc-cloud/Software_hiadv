import { describe, it, expect } from 'vitest'
import { paraCsv, nomeZip, leiaMe, TABELAS_EXPORTACAO } from '../../src/data/exportacao'
import { crc32, montarZip } from '../../src/lib/zip'
describe('exportação de dados', () => {
  it('CSV com ponto e vírgula, aspas e proteção contra fórmula', () => {
    const c = paraCsv([{ nome: 'Ana; Maria', obs: 'disse "oi"', v: 10 }, { nome: '=HYPERLINK("x")', extra: { a: 1 } }])
    expect(c.startsWith('﻿nome;obs;v;extra\r\n')).toBe(true)
    expect(c).toContain('"Ana; Maria";"disse ""oi""";10;')
    expect(c).toContain(`"'=HYPERLINK(""x"")";;;"{""a"":1}"`)
  })
  it('nome do arquivo com data invertida', () => { expect(nomeZip('Lanhi Advogados', new Date('2026-11-26T15:00:00Z'))).toBe('2026_11_26-hiadv-lanhi-advogados.zip') })
  it('LEIA-ME lista todas as tabelas', () => { const t = leiaMe('X', { clientes: 3 }); expect(t).toContain('clientes.csv: 3'); expect(t.split('.csv:').length - 1).toBe(TABELAS_EXPORTACAO.length) })
  it('ZIP válido', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    const z = montarZip([{ nome: 'a.csv', conteudo: 'x;y' }, { nome: 'b.txt', conteudo: 'oi' }])
    const v = new DataView(z.buffer)
    expect(v.getUint32(0, true)).toBe(0x04034b50)
    expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50)
    expect(v.getUint16(z.length - 12, true)).toBe(2)
  })
})
