// Mesa do Suporte na prévia: dados fictícios em memória, mesmas regras do banco.
import type { Api } from './api'
import { validarAtualizacao, type Atualizacao, type GrupoAtualizacoes, type MensagemCliente, type OrigemAtualizacao, type StatusAtualizacao } from './suporte'

type Item = Atualizacao & { clienteId: string }
type Msg = MensagemCliente & { clienteId: string; lidaEquipe: boolean }

export type SuporteApi = Pick<Api, 'suporteGerar' | 'suporteFila' | 'suporteSalvar' | 'suporteDescartar' | 'suportePublicar' | 'suporteNova' | 'suporteConversas' | 'suporteMensagens' | 'suporteResponder'>

const EU = 'ana@silvaprado.exemplo.br'
const atras = (h: number) => new Date(Date.now() - h * 36e5).toISOString()

export function suporteDemo(nomeCliente: (id: string) => string | null, temAcesso: (id: string) => boolean): SuporteApi {
  const item = (id: string, clienteId: string, origem: OrigemAtualizacao, titulo: string, texto: string, interno: string | null, h: number): Item =>
    ({ id, clienteId, origem, titulo, texto, interno, status: 'rascunho', criadoEm: atras(h), editadoPor: null, publicadoEm: null, publicadoPor: null, lidaEm: null })
  const ITENS: Item[] = [
    item('at1', 'c1', 'andamento', 'Saiu a sentença do seu processo', 'O juiz deu a decisão do seu processo. A equipe está analisando o resultado e vai explicar para você o que muda e quais são os próximos passos.', 'Publicação oficial: Sentença (25/11/2026)', 3),
    item('at2', 'c1', 'pericia', 'Sua perícia foi marcada', 'A perícia é no dia 04/12/2026, às 14:30, em Agência do INSS de Joaçaba. Leve documento com foto e todos os exames e atestados que tiver. A equipe vai orientar você antes.', null, 5),
    item('at3', 'c2', 'pendencia', 'Precisamos de um documento', 'Para seguir com o seu caso, precisamos de: Laudo do ortopedista. Pode ser foto legível.', null, 8),
    item('at4', 'c4', 'andamento', 'O INSS foi chamado a responder', 'O processo foi enviado ao INSS para ele se manifestar. É uma etapa normal e não depende de nada da sua parte agora.', 'Citação (24/11/2026)', 26),
    item('at5', 'c5', 'fase', 'Seu caso avançou de etapa', 'Agora o seu caso está na etapa: Pedido protocolado, em análise.', 'Status: Requerimento → Ag. análise INSS', 30),
  ]
  const MSGS: Msg[] = [
    { id: 'mm1', clienteId: 'c2', autor: 'cliente', texto: 'Boa tarde! O laudo do ortopedista pode ser foto?', em: atras(2), lidaEquipe: false },
    { id: 'mm2', clienteId: 'c4', autor: 'cliente', texto: 'Oi, alguma novidade do meu processo?', em: atras(20), lidaEquipe: true },
    { id: 'mm3', clienteId: 'c4', autor: 'equipe', autorEmail: EU, texto: 'Oi, Carla! O processo foi enviado ao INSS esta semana. Assim que houver resposta, aparece aqui.', em: atras(19), lidaEquipe: true },
  ]
  const nome = (id: string) => nomeCliente(id) ?? 'Cliente'
  const sem = ({ clienteId: _c, ...a }: Item): Atualizacao => ({ ...a })

  return {
    async suporteGerar() { return 0 },
    async suporteFila(status: StatusAtualizacao) {
      const grupos = new Map<string, GrupoAtualizacoes>()
      for (const a of ITENS.filter((i) => i.status === status)) {
        const g = grupos.get(a.clienteId) ?? { clienteId: a.clienteId, cliente: nome(a.clienteId), temAcesso: temAcesso(a.clienteId), ultima: a.criadoEm, itens: [] }
        g.itens.push(sem(a)); if (a.criadoEm > g.ultima) g.ultima = a.criadoEm
        grupos.set(a.clienteId, g)
      }
      return [...grupos.values()].sort((a, b) => b.ultima.localeCompare(a.ultima)).map((g) => ({ ...g, itens: g.itens.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)) }))
    },
    async suporteSalvar(id, titulo, texto) {
      const m = validarAtualizacao(titulo, texto); if (m) throw new Error(m)
      const a = ITENS.find((i) => i.id === id && i.status === 'rascunho'); if (!a) throw new Error('Rascunho não encontrado ou já publicado.')
      a.titulo = titulo.trim(); a.texto = texto.trim(); a.editadoPor = EU
    },
    async suporteDescartar(ids) { let n = 0; for (const a of ITENS) if (ids.includes(a.id) && a.status === 'rascunho') { a.status = 'descartada'; n++ } return n },
    async suportePublicar(ids) {
      if (!ids.length) throw new Error('Escolha o que publicar.')
      const cl = new Set<string>(); let n = 0
      for (const a of ITENS) if (ids.includes(a.id) && a.status === 'rascunho') { a.status = 'publicada'; a.publicadoEm = new Date().toISOString(); a.publicadoPor = EU; cl.add(a.clienteId); n++ }
      return { publicadas: n, clientes: cl.size }
    },
    async suporteNova(clienteId, titulo, texto) {
      const m = validarAtualizacao(titulo, texto); if (m) throw new Error(m)
      if (!nomeCliente(clienteId)) throw new Error('Cliente não encontrado.')
      const a = item(`at${Date.now()}`, clienteId, 'manual', titulo.trim(), texto.trim(), null, 0); a.editadoPor = EU
      ITENS.unshift(a); return a.id
    },
    async suporteConversas() {
      const por = new Map<string, Msg[]>()
      for (const m of MSGS) por.set(m.clienteId, [...(por.get(m.clienteId) ?? []), m])
      return [...por.entries()].map(([clienteId, l]) => {
        const u = l[l.length - 1]
        return { clienteId, nome: nome(clienteId), ultimaEm: u.em, ultima: u.texto, naoLidas: l.filter((m) => m.autor === 'cliente' && !m.lidaEquipe).length }
      }).sort((a, b) => b.ultimaEm.localeCompare(a.ultimaEm))
    },
    async suporteMensagens(clienteId) {
      const l = MSGS.filter((m) => m.clienteId === clienteId)
      for (const m of l) if (m.autor === 'cliente') m.lidaEquipe = true
      return l.map(({ clienteId: _c, lidaEquipe: _l, ...m }) => ({ ...m }))
    },
    async suporteResponder(clienteId, texto) {
      const t = texto.trim(); if (!t || t.length > 2000) throw new Error('A mensagem precisa ter até 2.000 caracteres.')
      MSGS.push({ id: `mm${Date.now()}`, clienteId, autor: 'equipe', autorEmail: EU, texto: t, em: new Date().toISOString(), lidaEquipe: true })
    },
  }
}
