import { colunasDoFunil, contatoAtrasado, taxaConversao, validarLead, type Lead } from '../../src/data/atendimentos'
import { duracaoTela, lerDuracao, minutosDecorridos, somaMinutos } from '../../src/data/horas'
import { linkPortal, mensagemPortal, validarToken } from '../../src/data/portal'
import { noPrazo } from '../../src/data/relatorios'
import { dobrarLinha, escaparIcs, montarIcs } from '../../src/data/ical'

const lead = (p: Partial<Lead>): Lead => ({ id: 'x', nome: 'Rita', telefone: null, origem: null, area: null, assunto: null, etapa: 'novo', motivoPerda: null,
  responsavel: null, proximoContato: null, clienteId: null, criadoEm: '2026-11-01T10:00:00Z', ...p })

describe('atendimentos', () => {
  it('valida o básico', () => {
    const base = { nome: 'Rita Moura', telefone: '', origem: '', area: '', assunto: '', responsavel: '', proximoContato: '' }
    expect(validarLead(base)).toBeNull()
    expect(validarLead({ ...base, nome: ' ' })).toBe('Informe o nome.')
    expect(validarLead({ ...base, telefone: '(49) 9999' })).toMatch(/DDD/)
    expect(validarLead({ ...base, telefone: '+55 (49) 99999-0000' })).toBeNull()
  })
  it('contato atrasado só para quem segue aberto', () => {
    expect(contatoAtrasado({ etapa: 'conversa', proximoContato: '2026-11-01' }, '2026-11-02')).toBe(true)
    expect(contatoAtrasado({ etapa: 'conversa', proximoContato: '2026-11-02' }, '2026-11-02')).toBe(false)
    expect(contatoAtrasado({ etapa: 'perdido', proximoContato: '2026-11-01' }, '2026-11-02')).toBe(false)
  })
  it('ordena as colunas pelo próximo contato', () => {
    const c = colunasDoFunil([lead({ id: 'a' }), lead({ id: 'b', proximoContato: '2026-11-05' }), lead({ id: 'c', etapa: 'proposta' })])
    expect(c.novo.map((l) => l.id)).toEqual(['b', 'a'])
    expect(c.proposta).toHaveLength(1)
  })
  it('conversão', () => {
    expect(taxaConversao(3, 1)).toBe(75)
    expect(taxaConversao(0, 0)).toBeNull()
  })
})

describe('horas', () => {
  it('lê durações comuns', () => {
    expect(lerDuracao('45')).toBe(45)
    expect(lerDuracao('45 min')).toBe(45)
    expect(lerDuracao('1h30')).toBe(90)
    expect(lerDuracao('2h')).toBe(120)
    expect(lerDuracao('1:15')).toBe(75)
    expect(lerDuracao('1,5h')).toBe(90)
    expect(lerDuracao('0')).toBeNull()
    expect(lerDuracao('25h')).toBeNull()
    expect(lerDuracao('abc')).toBeNull()
  })
  it('mostra e soma', () => {
    expect(duracaoTela(45)).toBe('45 min')
    expect(duracaoTela(90)).toBe('1h30')
    expect(duracaoTela(125)).toBe('2h05')
    expect(duracaoTela(120)).toBe('2h')
    expect(somaMinutos([{ minutos: 30 }, { minutos: 45 }])).toBe(75)
    expect(minutosDecorridos(0, 10_000)).toBe(1)
    expect(minutosDecorridos(0, 30 * 60000)).toBe(30)
  })
})

describe('acompanhamento', () => {
  const tok = 'a'.repeat(64)
  it('monta o link e a mensagem', () => {
    expect(linkPortal('https://hiadv.com.br/', tok)).toBe(`https://hiadv.com.br/mp/${tok}`)
    expect(linkPortal('https://x.app', tok, true)).toBe(`https://x.app/#/acompanhar/${tok}`)
    const m = mensagemPortal('Rita Moura', 'Silva & Prado', 'L')
    expect(m).toContain('Olá, Rita!')
    expect(m).toContain('não compartilhe')
    expect(m).not.toMatch(/garant|ganh/i)
  })
  it('valida o token', () => {
    expect(validarToken(tok)).toBe(true)
    expect(validarToken('xyz')).toBe(false)
  })
})

describe('agenda (calendário)', () => {
  it('escapa texto', () => {
    expect(escaparIcs('a, b; c\nd')).toBe('a\\, b\\; c\\nd')
  })
  it('dobra linhas longas sem cortar acentos', () => {
    const l = 'SUMMARY:' + 'perícia '.repeat(20)
    const d = dobrarLinha(l)
    for (const p of d.split('\r\n')) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75)
    expect(d.split('\r\n ').join('')).toBe(l)
  })
  it('monta eventos de dia inteiro e com hora', () => {
    const ics = montarIcs([
      { uid: 't1', titulo: 'Prazo: Réplica', dia: '2026-11-30', quando: null, local: null },
      { uid: 'p1', titulo: 'Perícia · Rita', dia: null, quando: '2026-12-02T13:00:00Z', local: 'Fórum, sala 2' },
      { uid: 'z', titulo: 'sem data', dia: null, quando: null, local: null },
    ], 'HiAdv · Ana', new Date('2026-11-21T00:00:00Z'))
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART;VALUE=DATE:20261130\r\nDTEND;VALUE=DATE:20261201')
    expect(ics).toContain('DTSTART:20261202T130000Z\r\nDTEND:20261202T140000Z')
    expect(ics).toContain('LOCATION:Fórum\\, sala 2')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })
})

describe('produtividade', () => {
  it('% no prazo', () => {
    expect(noPrazo({ feitas: 4, no_prazo: 3 })).toBe(75)
    expect(noPrazo({ feitas: 0 })).toBeNull()
  })
})
