// Conversas e comunidades da prévia (dados fictícios, só na memória deste aparelho).
import type { Api } from './api'
import { normalizarTelefone, type Anexo, type Comunidade, type Contato, type Conversa, type Mensagem } from './conversas'

const EU = 'ana@silvaprado.exemplo.br'
const PESSOAS = [
  { email: EU, nome: 'Ana Prado', papel: 'master' },
  { email: 'rafael@silvaprado.exemplo.br', nome: 'Rafael Souza', papel: 'master' },
  { email: 'julia@silvaprado.exemplo.br', nome: 'Júlia Reis', papel: 'colaborador' },
  { email: 'marcos@silvaprado.exemplo.br', nome: 'Marcos Lima', papel: 'colaborador' },
]
const min = (m: number) => new Date(Date.now() - m * 60e3).toISOString()
let seq = 100
const novoId = () => `m${++seq}`
const msg = (autor: string, texto: string, ha: number, extra: Partial<Mensagem> = {}): Mensagem =>
  ({ id: novoId(), autor, texto, anexo: null, respostaA: null, reacoes: {}, criadoEm: min(ha), editadoEm: null, ...extra })

type Conv = Conversa & { msgs: Mensagem[] }
const CONVERSAS: Conv[] = [
  { id: 'cv-equipe', tipo: 'equipe', titulo: 'Equipe Silva & Prado', membros: [], naoLidas: 2, ultima: null, ultimaEm: '', msgs: [
    msg('rafael@silvaprado.exemplo.br', 'Bom dia! Meta da semana: protocolar os 6 requerimentos que estão em "Fazendo req adm".', 190),
    msg('julia@silvaprado.exemplo.br', 'Fechado. Já estou com 2 prontos para revisão.', 182),
    msg(EU, 'Ótimo. Quem pegar a perícia do Paulo na quinta avisa aqui.', 60, { reacoes: { 'rafael@silvaprado.exemplo.br': '👍' } }),
    msg('marcos@silvaprado.exemplo.br', 'Eu levo. Já separei o checklist da perícia.', 14),
    msg('julia@silvaprado.exemplo.br', 'Subi o modelo novo de quesitos na Biblioteca 🙌', 3),
  ] },
  { id: 'cv-julia', tipo: 'direta', titulo: null, membros: [EU, 'julia@silvaprado.exemplo.br'], naoLidas: 1, ultima: null, ultimaEm: '', msgs: [
    msg(EU, 'Júlia, consegue revisar a inicial da Rosa hoje?', 95),
    msg('julia@silvaprado.exemplo.br', 'Consigo sim, até as 16h te devolvo com os ajustes.', 8),
  ] },
  { id: 'cv-prev', tipo: 'grupo', titulo: 'Previdenciário', membros: [EU, 'julia@silvaprado.exemplo.br', 'marcos@silvaprado.exemplo.br'], naoLidas: 0, ultima: null, ultimaEm: '', msgs: [
    msg('marcos@silvaprado.exemplo.br', 'Saiu a exigência do INSS no caso da Carla: CTPS completa.', 600),
    msg(EU, 'Pedi a CTPS pelo app do cliente. Prazo de 30 dias.', 590),
  ] },
]

const CONTATOS: Contato[] = [
  { id: 'ct-1', tipo: 'externo', email: null, telefone: '+5549999990001', nome: 'Perito Dr. Exemplo (fictício)', obs: 'Agenda perícias às terças', editadoPor: EU, editadoEm: new Date().toISOString() },
  { id: 'ct-2', tipo: 'externo', email: null, telefone: '+5549999990002', nome: 'APS Exemplo (fictícia)', obs: null, editadoPor: EU, editadoEm: new Date().toISOString() },
]

type Com = Comunidade & { msgs: Mensagem[] }
const com = (id: string, nome: string, descricao: string, areas: string[] | null, soMasters: boolean, quemPosta: 'todos' | 'moderadores', msgs: Mensagem[], naoLidas = 0): Com =>
  ({ id, nome, descricao, areas, soMasters, quemPosta, anexos: true, audios: true, ativa: true, ordem: 0, ultima: null, naoLidas, ultimaEm: '', podePostar: quemPosta === 'todos', moderador: false, intervaloSeg: 0, links: false, aprovacao: false, participo: true, entrada: null, pedidos: 0, msgs })
const de = (nome: string, esc: string, texto: string, ha: number, extra: Partial<Mensagem> = {}) =>
  msg(`${nome.split(' ')[0]!.toLowerCase()}@exemplo.br`, texto, ha, { autorNome: nome, autorEscritorio: esc, ...extra })
const COMUNIDADES: Com[] = [
  com('co-avisos', 'Avisos do HiAdv', 'Novidades do sistema, manutenções e dicas. Só a moderação publica.', null, false, 'moderadores', [
    de('Equipe HiAdv', '', 'Chegaram as Conversas da equipe: texto, áudio, arquivos e chamada de voz e vídeo, tudo dentro do HiAdv.', 300),
  ], 1),
  com('co-masters', 'Masters HiAdv', 'Gestores Master de todos os escritórios: gestão, equipe e rotina.', null, true, 'todos', [
    de('Carla Nunes', 'Nunes Advocacia', 'Como vocês dividem a triagem de documentos entre a equipe? Aqui estamos usando o rodízio por carga.', 400),
    de('Bruno Alves', 'Alves & Costa', 'Rodízio por carga aqui também. Reduziu muito caso parado na etapa de documentos.', 380),
  ]),
  com('co-prev', 'Masters Previdenciários HiAdv', 'Para quem atua no previdenciário administrativo e judicial.', ['administrativo', 'judicial'], true, 'todos', [
    de('Paula Ramos', 'Ramos Previdenciário', 'Alguém já organizou a lista de documentos padrão para auxílio-acidente no checklist da etapa?', 220),
    de('Rafael Souza', 'Silva & Prado Advocacia', 'Sim, usamos CAT, laudos com CID e CNIS. Posso compartilhar o checklist.', 205),
  ], 2),
  com('co-trab', 'Masters Trabalhistas HiAdv', 'Para quem atua no trabalhista.', ['trabalhista'], true, 'todos', [
    de('Diego Martins', 'Martins Trabalhista', 'Dica: coloquem a audiência inicial como compromisso com 5 dias de preparação nas regras de atenção.', 1500),
  ]),
]

const ARQUIVOS = new Map<string, string>()
const resumoConv = (c: Conv): Conversa => {
  const u = c.msgs.at(-1)
  return { id: c.id, tipo: c.tipo, titulo: c.titulo, membros: c.tipo === 'equipe' ? PESSOAS.map((p) => p.email) : c.membros, naoLidas: c.naoLidas,
    ultima: u ? { autor: u.autor, texto: u.texto, anexo: u.anexo, criadoEm: u.criadoEm } : null, ultimaEm: u?.criadoEm ?? new Date(0).toISOString() }
}
const resumoCom = (c: Com): Comunidade => {
  const u = c.msgs.at(-1)
  const { msgs: _m, ...resto } = c
  return { ...resto, ultima: u ? { autorNome: u.autorNome ?? null, texto: u.texto, anexo: u.anexo, criadoEm: u.criadoEm } : null, ultimaEm: u?.criadoEm ?? new Date(0).toISOString() }
}
const achar = (id: string) => CONVERSAS.find((c) => c.id === id)
const acharCom = (id: string) => COMUNIDADES.find((c) => c.id === id)
const ouvintes = new Map<string, Set<() => void>>()
const avisar = (id: string) => ouvintes.get(id)?.forEach((f) => setTimeout(f, 0))

/** Respostas simuladas para a prévia parecer viva (só na conversa direta). */
function responder(c: Conv) {
  if (c.tipo !== 'direta') return
  const outro = c.membros.find((m) => m !== EU)!
  setTimeout(() => { c.msgs.push(msg(outro, 'Combinado! 👍', 0)); avisar(c.id) }, 1800)
}

type ConversasApi = Pick<Api, 'chatLista' | 'chatPessoas' | 'chatMensagens' | 'chatEnviar' | 'chatDireta' | 'chatGrupo' | 'chatLido' | 'chatReagir' | 'chatApagar' | 'chatSubir' | 'chatUrl' | 'chatAssinar'
  | 'comLista' | 'comMensagens' | 'comEnviar' | 'comLido' | 'comReagir' | 'comApagar' | 'comSalvar' | 'comPessoas' | 'comSilenciar' | 'comPedirEntrada' | 'contatoLista' | 'contatoSalvar' | 'contatoApagar' | 'comPedidos' | 'comDecidirEntrada' | 'reuniaoAtiva' | 'reuniaoIniciar' | 'reuniaoEncerrar' | 'reuniaoCanal' | 'reuniaoIce'>

export function conversasDemo(): ConversasApi {
  const reagir = (lista: Mensagem[], id: string, e: string) => {
    const m = lista.find((x) => x.id === id); if (!m) return
    if (m.reacoes[EU] === e) { const { [EU]: _x, ...r } = m.reacoes; m.reacoes = r } else m.reacoes = { ...m.reacoes, [EU]: e }
  }
  return {
    async chatLista() { return CONVERSAS.map(resumoConv).sort((a, b) => b.ultimaEm.localeCompare(a.ultimaEm)) },
    async chatPessoas() { return PESSOAS },
    async chatMensagens(id) { return [...(achar(id)?.msgs ?? [])] },
    async chatEnviar(id, texto, anexo, respostaA) {
      const c = achar(id); if (!c) throw new Error('Conversa não encontrada.')
      const m = msg(EU, texto ?? '', 0, { texto: texto || null, anexo: anexo ?? null, respostaA: respostaA ?? null })
      c.msgs.push(m); avisar(id); responder(c)
      return m
    },
    async chatDireta(email) {
      const existe = CONVERSAS.find((c) => c.tipo === 'direta' && c.membros.includes(email))
      if (existe) return existe.id
      const c: Conv = { id: `cv-${email}`, tipo: 'direta', titulo: null, membros: [EU, email], naoLidas: 0, ultima: null, ultimaEm: '', msgs: [] }
      CONVERSAS.push(c); return c.id
    },
    async chatGrupo(titulo, emails, id) {
      if (titulo.trim().length < 2) throw new Error('O nome do grupo precisa ter entre 2 e 80 caracteres.')
      if (!emails.length) throw new Error('Escolha pelo menos mais uma pessoa.')
      if (id) { const c = achar(id)!; c.titulo = titulo; c.membros = [EU, ...emails]; return id }
      const c: Conv = { id: `cv-g${++seq}`, tipo: 'grupo', titulo, membros: [EU, ...emails], naoLidas: 0, ultima: null, ultimaEm: '', msgs: [] }
      CONVERSAS.push(c); return c.id
    },
    async chatLido(id) { const c = achar(id); if (c) c.naoLidas = 0 },
    async chatReagir(id, e) { for (const c of CONVERSAS) reagir(c.msgs, id, e) },
    async chatApagar(id) { for (const c of CONVERSAS) c.msgs = c.msgs.filter((m) => m.id !== id) },
    async chatSubir(_onde, pasta, arquivo, nome, extra) {
      const path = `${pasta}/${Date.now()}-${nome}`
      ARQUIVOS.set(path, URL.createObjectURL(arquivo))
      return { path, nome, tipo: arquivo.type || 'application/octet-stream', tamanho: arquivo.size, ...extra } as Anexo
    },
    async chatUrl(_onde, path) { const u = ARQUIVOS.get(path); if (!u) throw new Error('Arquivo indisponível.'); return u },
    chatAssinar(id, fn) {
      const s = ouvintes.get(id) ?? new Set(); s.add(fn); ouvintes.set(id, s)
      return () => { s.delete(fn) }
    },
    async comLista() { return COMUNIDADES.map(resumoCom) },
    async comMensagens(id) { return [...(acharCom(id)?.msgs ?? [])] },
    async comEnviar(id, texto, anexo, respostaA) {
      const c = acharCom(id); if (!c) throw new Error('Comunidade não encontrada.')
      if (!c.podePostar) throw new Error('Nesta comunidade só a moderação publica.')
      c.msgs.push(msg(EU, texto ?? '', 0, { texto: texto || null, anexo: anexo ?? null, respostaA: respostaA ?? null, autorNome: 'Ana Prado', autorEscritorio: 'Silva & Prado Advocacia' }))
      avisar(id)
    },
    async comLido(id) { const c = acharCom(id); if (c) c.naoLidas = 0 },
    async comReagir(id, e) { for (const c of COMUNIDADES) reagir(c.msgs, id, e) },
    async comApagar(id) { for (const c of COMUNIDADES) c.msgs = c.msgs.filter((m) => m.id !== id) },
    async comSalvar() { throw new Error('Na prévia, as comunidades não podem ser alteradas.') },
    async comPessoas() { return [] },
    async comSilenciar() { throw new Error('Na prévia, a moderação não está disponível.') },
    async contatoLista() { return CONTATOS.map((c) => ({ ...c })) },
    async contatoSalvar(f) {
      const tel = f.tipo === 'externo' ? normalizarTelefone(f.telefone ?? '') : null
      if (f.tipo === 'externo' && !tel) throw new Error('Confira o número: DDD e telefone, como (49) 99999-0000.')
      const atual = CONTATOS.find((c) => (f.id && c.id === f.id) || (f.tipo === 'equipe' && c.email === f.email))
      if (atual) { Object.assign(atual, { nome: f.nome, obs: f.obs ?? null, telefone: tel ?? atual.telefone, editadoPor: EU, editadoEm: new Date().toISOString() }); return atual.id }
      const id = 'ct-' + Math.random().toString(36).slice(2)
      CONTATOS.push({ id, tipo: f.tipo, email: f.email ?? null, telefone: tel, nome: f.nome, obs: f.obs ?? null, editadoPor: EU, editadoEm: new Date().toISOString() })
      return id
    },
    async contatoApagar(id) { const i = CONTATOS.findIndex((c) => c.id === id); if (i >= 0) CONTATOS.splice(i, 1) },
    async comPedirEntrada() { throw new Error('Na prévia, os pedidos de entrada não estão disponíveis.') },
    async comPedidos() { return [] },
    async comDecidirEntrada() { throw new Error('Na prévia, a moderação não está disponível.') },
    async reuniaoAtiva() { return null },
    async reuniaoIniciar() { throw new Error('Na prévia não há chamada de verdade. No seu escritório, a chamada de voz e vídeo abre aqui mesmo.') },
    async reuniaoEncerrar() {},
    reuniaoCanal() { return null },
    async reuniaoIce() { return [] },
  }
}
