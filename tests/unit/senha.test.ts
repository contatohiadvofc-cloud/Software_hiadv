import { mensagemLogin, normSenha, regrasSenha, senhaPronta } from '../../src/data/senha'

describe('senha da equipe', () => {
  it('normaliza como o servidor', () => {
    expect(normSenha('  café1234 ')).toBe('café1234')
    expect(normSenha('café')).toBe('café')
  })
  it('confere as regras da senha pessoal', () => {
    const r = regrasSenha('nova2026x', 'nova2026x', 'mestra')
    expect(r).toEqual({ tamanho: true, letra: true, numero: true, confere: true, diferenteDaMestra: true })
    expect(senhaPronta(r)).toBe(true)
    expect(senhaPronta(regrasSenha('abc', 'abc', 'x'))).toBe(false)
    expect(regrasSenha('igual12345', 'igual12345', 'igual12345').diferenteDaMestra).toBe(false)
    expect(regrasSenha('semnumero', 'semnumero', 'x').numero).toBe(false)
  })
  it('explica cada recusa', () => {
    expect(mensagemLogin('senha', 4)).toMatch(/incorretos\. Restam 4 tentativas/)
    expect(mensagemLogin('senha', 1)).toMatch(/Restam 1 tentativa antes/)
    expect(mensagemLogin('bloqueado')).toMatch(/15 minutos/)
    expect(mensagemLogin('mestra')).toMatch(/Senha mestra incorreta/)
    expect(mensagemLogin('qualquer')).toMatch(/Não foi possível entrar/)
  })
})
