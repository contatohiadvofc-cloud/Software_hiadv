import { describe, expect, it } from 'vitest'
import { ehAviso, ordenarMembros, podeNoGrupo } from '../../src/data/conversas'
describe('grupos no padrão WhatsApp', () => {
  it.each([
    [{ euAdmin: true, soAdminsEnviam: true, soAdminsEditam: true }, { enviar: true, editarDados: true, gerenciar: true }],
    [{ euAdmin: false, soAdminsEnviam: true, soAdminsEditam: true }, { enviar: false, editarDados: false, gerenciar: false }],
    [{ euAdmin: false, soAdminsEnviam: false, soAdminsEditam: false }, { enviar: true, editarDados: true, gerenciar: false }],
    [{ euAdmin: false, soAdminsEnviam: false, soAdminsEditam: true }, { enviar: true, editarDados: false, gerenciar: false }],
  ])('permissões %o', (g, esperado) => { expect(podeNoGrupo(g)).toEqual(esperado) })
  it('lista: você primeiro, depois admins, depois por ordem de entrada', () => {
    const l = [{ email: 'c', admin: false, entrouEm: '2026-01-01' }, { email: 'b', admin: true, entrouEm: '2026-03-01' }, { email: 'eu', admin: false, entrouEm: '2026-05-01' }, { email: 'a', admin: false, entrouEm: '2025-01-01' }]
    expect(ordenarMembros(l, 'eu').map((m) => m.email)).toEqual(['eu', 'b', 'a', 'c'])
  })
  it('aviso de sistema é reconhecido', () => { expect(ehAviso({ autor: 'sistema' })).toBe(true); expect(ehAviso({ autor: 'ana@x' })).toBe(false) })
})
