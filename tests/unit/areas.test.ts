import { areasParaLigar, nomeDaArea } from '../../src/data/areas'

describe('catálogo de áreas', () => {
  it('lista só as que faltam ligar', () => {
    const faltam = areasParaLigar([{ area: 'trabalhista' }, { area: 'administrativo' }]).map((a) => a.area)
    expect(faltam).toEqual(['judicial', 'civel', 'bancario', 'penal', 'extrajudicial'])
  })
  it('dá o nome padrão', () => {
    expect(nomeDaArea('civel')).toBe('Cível')
    expect(nomeDaArea('xyz')).toBe('xyz')
  })
})
