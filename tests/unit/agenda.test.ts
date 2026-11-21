import { agruparAgenda, nomeTipo, rotuloDia, type Compromisso } from '../../src/data/agenda'

const c = (id: string, dia: string, hora: string): Compromisso => ({ id, tipo: 'pericia', titulo: 'Perícia', cliente: id, clienteId: null, dia, hora, local: '', quem: '' })
const agora = new Date('2026-11-21T15:00:00Z')

describe('agenda', () => {
  it('agrupa por dia a partir de hoje, em ordem de hora', () => {
    const g = agruparAgenda([c('b', '2026-11-21', '14:00'), c('a', '2026-11-21', '09:30'), c('velho', '2026-11-20', '10:00'), c('x', '2026-11-24', '08:00'), c('longe', '2027-02-01', '08:00')], agora)
    expect(g.map((d) => [d.rotulo, d.itens.map((i) => i.id)])).toEqual([['Hoje', ['a', 'b']], ['Terça-feira, 24/11', ['x']]])
  })
  it('amanhã', () => expect(rotuloDia('2026-11-22', '2026-11-21')).toBe('Amanhã'))
  it('nome do tipo legível', () => {
    expect(nomeTipo('medica', 'Perícia')).toBe('Médica')
    expect(nomeTipo('instrucao', 'Audiência')).toBe('Instrução')
    expect(nomeTipo(null, 'Audiência')).toBe('Audiência')
  })
})
