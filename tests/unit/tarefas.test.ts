import { agruparTarefas, nomeDe, validarNovaTarefa, type Tarefa } from '../../src/data/tarefas'

const t = (id: string, prazo: string | null, fatal = false): Tarefa => ({ id, titulo: id, detalhe: null, prazo, fatal, responsavel: null })
const agora = new Date('2026-11-21T15:00:00Z') // 12h em Brasília

describe('agruparTarefas', () => {
  it('separa por prazo e não perde as distantes', () => {
    const g = agruparTarefas([t('a', '2026-11-20'), t('b', '2026-11-21'), t('c', '2026-11-28'), t('d', '2026-12-15'), t('e', null)], agora)
    expect([g.atrasadas, g.hoje, g.semana, g.depois, g.semData].map((x) => x.map((y) => y.id))).toEqual([['a'], ['b'], ['c'], ['d'], ['e']])
  })
  it('no mesmo dia, prazo fatal vem primeiro', () => {
    const g = agruparTarefas([t('comum', '2026-11-21'), t('fatal', '2026-11-21', true)], agora)
    expect(g.hoje.map((x) => x.id)).toEqual(['fatal', 'comum'])
  })
})

describe('nomeDe', () => {
  it('usa o primeiro nome; sem responsável é da equipe', () => {
    expect(nomeDe('ana@x.br', [{ email: 'ana@x.br', nome: 'Ana Prado' }])).toBe('Ana')
    expect(nomeDe(null, [])).toBe('Equipe')
    expect(nomeDe('rafa@x.br', [])).toBe('rafa')
  })
})

describe('validarNovaTarefa', () => {
  const base = { titulo: 'Pedir CTPS', responsavel: '', prazo: '', detalhe: '' }
  it('pede título', () => expect(validarNovaTarefa({ ...base, titulo: ' a ' })).toBe('Escreva o que precisa ser feito.'))
  it('aceita sem prazo e sem responsável', () => expect(validarNovaTarefa(base)).toBeNull())
  it('recusa data absurda', () => expect(validarNovaTarefa({ ...base, prazo: '2020-01-01' }, '2026-11-21')).toBe('A data parece errada (mais de um ano atrás).'))
})
