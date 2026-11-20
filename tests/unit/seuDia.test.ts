import { agruparSeuDia, diaSP, type ItemDia } from '../../src/data/seuDia'

const base = (over: Partial<ItemDia>): ItemDia => ({ id: Math.random().toString(), tipo: 'tarefa', titulo: 't', sub: '', dia: null, hora: null, quem: '', ...over })

describe('diaSP', () => {
  it('usa o fuso de Brasília', () => {
    // 02:30 UTC de 21/11 ainda é 20/11 em São Paulo (UTC-3)
    expect(diaSP(new Date('2026-11-21T02:30:00Z'))).toBe('2026-11-20')
  })
})

describe('agruparSeuDia', () => {
  const hoje = new Date('2026-11-20T15:00:00Z') // 12:00 em SP
  it('separa atrasados, hoje, próximos 7 dias e sem prazo', () => {
    const g = agruparSeuDia([
      base({ id: 'ontem', dia: '2026-11-19' }),
      base({ id: 'hoje-noite', dia: '2026-11-20', hora: '23:00' }),
      base({ id: 'mais7', dia: '2026-11-27' }),
      base({ id: 'mais8', dia: '2026-11-28' }),
      base({ id: 'sem', dia: null }),
    ], hoje)
    expect(g.atrasados.map((i) => i.id)).toEqual(['ontem'])
    expect(g.hoje.map((i) => i.id)).toEqual(['hoje-noite'])
    expect(g.proximos7.map((i) => i.id)).toEqual(['mais7'])
    expect(g.semPrazo.map((i) => i.id)).toEqual(['sem'])
  })
  it('ordena por dia e hora dentro do grupo', () => {
    const g = agruparSeuDia([
      base({ id: 'b', dia: '2026-11-20', hora: '14:00' }),
      base({ id: 'a', dia: '2026-11-20', hora: '09:30' }),
      base({ id: 'c', dia: '2026-11-20', hora: null }),
    ], hoje)
    expect(g.hoje.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})
