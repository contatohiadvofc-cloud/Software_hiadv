import { describe, it, expect } from 'vitest'
import { linkWhatsApp, nomesComApelidos, normalizarTelefone, telefoneTela } from '../../src/data/conversas'

describe('contatos', () => {
  it('normaliza número brasileiro como o servidor', () => {
    expect(normalizarTelefone('(49) 99999-0001')).toBe('+5549999990001')
    expect(normalizarTelefone('049 3555-0000')).toBe('+554935550000')
    expect(normalizarTelefone('+1 415 555 0100')).toBe('+14155550100')
    expect(normalizarTelefone('123')).toBeNull()
  })
  it('mostra e abre no WhatsApp', () => {
    expect(telefoneTela('+5549999990001')).toBe('(49) 99999-0001')
    expect(linkWhatsApp('+5549999990001')).toBe('https://wa.me/5549999990001')
  })
  it('nome dado pela equipe vale sobre o cadastro', () => {
    const m = nomesComApelidos([{ email: 'a@x', nome: 'Ana Maria Prado' }], [{ id: '1', tipo: 'equipe', email: 'a@x', telefone: null, nome: 'Ana (Comercial)', obs: null, editadoPor: null, editadoEm: '' }])
    expect(m.get('a@x')).toBe('Ana (Comercial)')
  })
})
