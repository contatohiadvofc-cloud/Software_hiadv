import { describe, it, expect, vi } from 'vitest'
import { CAMINHO, criarMpApi, diasAte, linkWhats, pontoNoCaminho, quandoFoi, tokenDoEndereco } from '../../src/mp/dados'
import { alertasTexto, idsDosGrupos, resumoPublicacao, validarAtualizacao, type GrupoAtualizacoes } from '../../src/data/suporte'

const tok = 'a'.repeat(64)

describe('Meu Processo: onde está o caso', () => {
  it.each([
    ['Aguardando os seus documentos', false, 0, true],
    ['Preparando o seu pedido', false, 0, false],
    ['Respondendo a uma exigência', false, 1, false],
    ['Pedido protocolado, em análise', false, 1, false],
    ['Aguardando a perícia', false, 2, false],
    ['Aguardando a audiência', false, 2, false],
    ['Aguardando decisão', false, 3, false],
    ['Na fase de pagamento', false, 4, false],
    ['Concluído', true, 5, false],
    ['Em andamento', false, 1, false],
  ])('%s → etapa %i', (fase, fim, indice, precisa) => {
    expect(pontoNoCaminho(fase as string, fim as boolean)).toEqual({ indice, precisaDeVoce: precisa })
  })
  it('o caminho tem 6 etapas e termina em Concluído', () => { expect(CAMINHO).toHaveLength(6); expect(CAMINHO[5]).toBe('Concluído') })
})

describe('Meu Processo: link pessoal', () => {
  it('aceita /mp/<token>, #<token> e ?t=<token>', () => {
    expect(tokenDoEndereco(`/mp/${tok}`, '', '')).toBe(tok)
    expect(tokenDoEndereco('/meu-processo.html', `#${tok}`, '')).toBe(tok)
    expect(tokenDoEndereco('/mp', '', `?t=${tok}`)).toBe(tok)
    expect(tokenDoEndereco('/mp/demo', '', '')).toBe('demo')
  })
  it('recusa token inválido', () => {
    expect(tokenDoEndereco('/mp/abc', '', '')).toBeNull()
    expect(tokenDoEndereco(`/mp/${'g'.repeat(64)}`, '', '')).toBeNull()
    expect(tokenDoEndereco('/mp', '#<script>', '')).toBeNull()
  })
  it('WhatsApp com DDI e texto', () => {
    expect(linkWhats('(49) 99999-0000', 'Olá')).toBe('https://wa.me/5549999990000?text=Ol%C3%A1')
    expect(linkWhats(null, 'x')).toBeNull()
  })
  it('datas como no celular', () => {
    const agora = new Date('2026-11-26T15:00:00-03:00')
    expect(quandoFoi('2026-11-26T09:10:00-03:00', agora)).toBe('hoje, 09:10')
    expect(quandoFoi('2026-11-25T16:00:00-03:00', agora)).toBe('ontem, 16:00')
    expect(diasAte('2026-11-29T10:00:00-03:00', agora)).toBe(3)
  })
})

describe('Meu Processo: chamadas ao banco', () => {
  it('usa só as funções públicas com o token', async () => {
    const rpc = vi.fn(async (fn: string) => (fn === 'mp_inicio' ? { ok: true, cliente: 'Ana', escritorio: { nome: 'X' }, casos: [], compromissos: [], atualizacoes: [], pendencias: [], naoLidas: 0, expiraEm: '' } : fn === 'mp_mensagens_ler' ? { ok: true, mensagens: [] } : { ok: true }))
    const api = criarMpApi(rpc, tok)
    const d = await api.inicio()
    expect(d?.cliente).toBe('Ana'); expect(d && 'ok' in d).toBe(false)
    await api.lidas([]); expect(rpc).toHaveBeenCalledTimes(1)
    await api.lidas(['x']); expect(rpc).toHaveBeenLastCalledWith('mp_lida', { p_token: tok, p_ids: ['x'] })
    await api.enviar('oi'); expect(rpc).toHaveBeenLastCalledWith('mp_enviar', { p_token: tok, p_texto: 'oi' })
  })
  it('link vencido devolve null e erro de envio aparece', async () => {
    const api = criarMpApi(async (fn) => (fn === 'mp_inicio' ? { ok: false } : { ok: false, erro: 'Este link não está mais valendo.' }), tok)
    expect(await api.inicio()).toBeNull()
    await expect(api.enviar('oi')).rejects.toThrow('não está mais valendo')
  })
})

describe('Mesa do Suporte', () => {
  it('valida como o banco', () => {
    expect(validarAtualizacao('A', 'texto')).toMatch(/título/)
    expect(validarAtualizacao('Título', 'x'.repeat(1501))).toMatch(/texto/)
    expect(validarAtualizacao('  Título ok  ', ' Texto ok ')).toBeNull()
  })
  it('avisa promessa de resultado, valores e notícia ruim', () => {
    expect(alertasTexto('Vamos ganhar com certeza')).toHaveLength(1)
    expect(alertasTexto('Você vai receber R$ 5.000')[0]).toMatch(/Valores/)
    expect(alertasTexto('O pedido perdeu na primeira instância').some((a) => /desfavorável/.test(a))).toBe(true)
    expect(alertasTexto('O processo foi enviado ao INSS.')).toEqual([])
  })
  it('publicar tudo pega só rascunhos', () => {
    const base = { titulo: 't', texto: 'x', interno: null, criadoEm: '', editadoPor: null, publicadoEm: null, publicadoPor: null, lidaEm: null, origem: 'manual' as const }
    const g: GrupoAtualizacoes[] = [{ clienteId: 'c', cliente: 'C', temAcesso: true, ultima: '', itens: [{ ...base, id: '1', status: 'rascunho' }, { ...base, id: '2', status: 'publicada' }] }]
    expect(idsDosGrupos(g)).toEqual(['1'])
    expect(idsDosGrupos(g, new Set(['2']))).toEqual([])
  })
  it('resumo no singular e plural', () => {
    expect(resumoPublicacao(1, 1)).toBe('1 atualização publicada para 1 cliente.')
    expect(resumoPublicacao(3, 2)).toBe('3 atualizações publicadas para 2 clientes.')
    expect(resumoPublicacao(0, 0)).toBe('Nada para publicar.')
  })
})
