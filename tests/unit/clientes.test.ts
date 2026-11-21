import { linkWhatsapp, telefoneTela, termoBusca } from '../../src/data/clientes'

describe('clientes', () => {
  it('termo de busca sem curingas', () => expect(termoBusca(' Ana%, (Silva)_ ')).toBe('Ana Silva'))
  it('telefone formatado', () => {
    expect(telefoneTela('49999112233')).toBe('(49) 99911-2233')
    expect(telefoneTela('+55 49 3555-1234')).toBe('(49) 3555-1234')
  })
  it('link de WhatsApp com DDI', () => {
    expect(linkWhatsapp('(49) 99911-2233')).toBe('https://wa.me/5549999112233')
    expect(linkWhatsapp('123')).toBeNull()
  })
})
