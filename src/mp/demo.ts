// Meu Processo de demonstração: cliente fictício, nada é salvo.
import type { MpApi, MpInicio, MpMensagem } from './dados'

const dias = (n: number, h = 14, m = 30) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d.toISOString() }

export function criarMpDemo(): MpApi {
  const inicio: MpInicio = {
    escritorio: { nome: 'Silva & Prado Advocacia', whatsapp: '49999990000', cidade: 'Joaçaba/SC' },
    cliente: 'Rita',
    casos: [{ area: 'Auxílio-acidente', fase: 'Aguardando a perícia', etapa: 3, etapas: 6, desde: dias(-12).slice(0, 10), concluido: false }],
    compromissos: [{ tipo: 'Perícia', quando: dias(8), local: 'Agência do INSS de Joaçaba, Rua Getúlio Vargas, 100' }],
    atualizacoes: [
      { id: 'u1', titulo: 'Sua perícia foi marcada', texto: 'A perícia é no dia indicado acima. Leve documento com foto e todos os exames e atestados que tiver. Dois dias antes, a equipe vai conversar com você para explicar como funciona.', em: dias(0, 9, 10), lida: false },
      { id: 'u2', titulo: 'O INSS foi chamado a responder', texto: 'O processo foi enviado ao INSS para ele se manifestar. É uma etapa normal e não depende de nada da sua parte agora.', em: dias(-6, 16, 2), lida: true },
      { id: 'u3', titulo: 'Seu processo foi aberto na Justiça', texto: 'O seu pedido foi registrado na Justiça e já tem número de processo. A partir de agora, as novidades aparecem aqui.', em: dias(-12, 11, 40), lida: true },
    ],
    pendencias: [{ id: 'p1', titulo: 'Exame de raio-X do joelho', detalhe: 'Pode ser foto legível do laudo, frente e verso.', status: 'aberta', motivo: null }],
    naoLidas: 1,
    expiraEm: dias(80),
  }
  const msgs: MpMensagem[] = [
    { id: 'm1', autor: 'cliente', texto: 'Boa tarde! Preciso levar alguma coisa na perícia?', em: dias(-1, 15, 12) },
    { id: 'm2', autor: 'equipe', texto: 'Oi, Rita! Leve documento com foto, a carteira de trabalho e todos os exames. Dois dias antes a gente conversa com você.', em: dias(-1, 15, 40) },
  ]
  return {
    async inicio() { return structuredClone(inicio) },
    async lidas(ids) { for (const a of inicio.atualizacoes) if (ids.includes(a.id)) a.lida = true },
    async mensagens() { inicio.naoLidas = 0; return msgs.map((m) => ({ ...m })) },
    async enviar(texto) {
      const t = texto.trim(); if (!t) return; if (t.length > 2000) throw new Error('A mensagem precisa ter até 2.000 caracteres.')
      msgs.push({ id: `m${Date.now()}`, autor: 'cliente', texto: t, em: new Date().toISOString() })
    },
  }
}
