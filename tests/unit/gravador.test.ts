import { describe, expect, it } from 'vitest'
import { formatoGravacao, nomeGravacao } from '../../src/lib/gravador'
import { abrirChamada, chamadaAtual, fecharChamada } from '../../src/lib/chamadaAtiva'

describe('gravação e chamada ativa', () => {
  it('escolhe o melhor formato suportado', () => {
    expect(formatoGravacao(() => true)).toBe('video/webm;codecs=vp9,opus')
    expect(formatoGravacao((m) => m === 'video/mp4')).toBe('video/mp4')
    expect(formatoGravacao(() => false)).toBe('')
  })
  it('nomeia o arquivo com data invertida', () => {
    expect(nomeGravacao(new Date(2026, 10, 26, 17, 4), 'video/webm')).toBe('chamada_2026_11_26-17h04.webm')
    expect(nomeGravacao(new Date(2026, 0, 2, 9, 30), 'video/mp4')).toBe('chamada_2026_01_02-09h30.mp4')
  })
  it('guarda a chamada fora da tela de conversas', () => {
    const c = { id: 'r1', video: true, titulo: 'Equipe', conversa: 'c1', eu: { email: 'a@x', nome: 'A' } }
    abrirChamada(c); expect(chamadaAtual()?.id).toBe('r1')
    abrirChamada({ ...c, titulo: 'outro' }); expect(chamadaAtual()?.titulo).toBe('Equipe')
    fecharChamada(); expect(chamadaAtual()).toBeNull()
  })
})
