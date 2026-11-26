// Conversas e comunidades da prévia (dados fictícios, só na memória deste aparelho).
import type { Api } from './api'
import { canalLocal } from './canalLocal'
import { normalizarTelefone, type Anexo, type Comunidade, type Contato, type Conversa, type Mensagem } from './conversas'

const EU = 'ana@silvaprado.exemplo.br'
const PESSOAS = [
  { email: EU, nome: 'Ana Prado', papel: 'master' },
  { email: 'rafael@silvaprado.exemplo.br', nome: 'Rafael Souza', papel: 'master' },
  { email: 'julia@silvaprado.exemplo.br', nome: 'Júlia Reis', papel: 'colaborador' },
  { email: 'marcos@silvaprado.exemplo.br', nome: 'Marcos Lima', papel: 'colaborador' },
]
const nome = (e: string) => PESSOAS.find((p) => p.email === e)?.nome ?? e.split('@')[0]
const min = (m: number) => new Date(Date.now() - m * 60e3).toISOString()
let seq = 100
const novoId = () => `m${++seq}`
const msg = (autor: string, texto: string, ha: number, extra: Partial<Mensagem> = {}): Mensagem =>
  ({ id: novoId(), autor, texto, anexo: null, respostaA: null, reacoes: {}, criadoEm: min(ha), editadoEm: null, ...extra })

type Conv = Conversa & { msgs: Mensagem[]; admins?: string[]; descricao?: string | null; soAdminsEnviam?: boolean; soAdminsEditam?: boolean; entrou?: Record<string, string> }
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
  { id: 'cv-prev', tipo: 'grupo', titulo: 'Previdenciário', admins: [EU], descricao: 'Casos de auxílio-acidente e B31 da equipe.', membros: [EU, 'julia@silvaprado.exemplo.br', 'marcos@silvaprado.exemplo.br'], naoLidas: 0, ultima: null, ultimaEm: '', msgs: [
    msg('marcos@silvaprado.exemplo.br', 'Saiu a exigência do INSS no caso da Carla: CTPS completa.', 600),
    msg(EU, 'Pedi a CTPS pelo app do cliente. Prazo de 30 dias.', 590),
  ] },
]

let demoAtiva: { id: string; conversa: string; video: boolean; inicio: number } | null = null

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
  com('co-masters', 'Gestores HiAdv', 'Gestores de todos os escritórios: gestão, equipe e rotina.', null, true, 'todos', [
    de('Carla Nunes', 'Nunes Advocacia', 'Como vocês dividem a triagem de documentos entre a equipe? Aqui estamos usando o rodízio por carga.', 400),
    de('Bruno Alves', 'Alves & Costa', 'Rodízio por carga aqui também. Reduziu muito caso parado na etapa de documentos.', 380),
  ]),
  com('co-prev', 'Gestores Previdenciários HiAdv', 'Para quem atua no previdenciário administrativo e judicial.', ['administrativo', 'judicial'], true, 'todos', [
    de('Paula Ramos', 'Ramos Previdenciário', 'Alguém já organizou a lista de documentos padrão para auxílio-acidente no checklist da etapa?', 220),
    de('Rafael Souza', 'Silva & Prado Advocacia', 'Sim, usamos CAT, laudos com CID e CNIS. Posso compartilhar o checklist.', 205),
  ], 2),
  com('co-trab', 'Gestores Trabalhistas HiAdv', 'Para quem atua no trabalhista.', ['trabalhista'], true, 'todos', [
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

type ConversasApi = Pick<Api, 'grupoInfo' | 'grupoEditar' | 'grupoRegras' | 'grupoAdicionar' | 'grupoRemover' | 'grupoAdmin' | 'grupoSair' | 'chatLista' | 'chatPessoas' | 'chatMensagens' | 'chatEnviar' | 'chatDireta' | 'chatGrupo' | 'chatLido' | 'chatReagir' | 'chatApagar' | 'chatSubir' | 'chatUrl' | 'chatAssinar'
  | 'comLista' | 'comMensagens' | 'comEnviar' | 'comLido' | 'comReagir' | 'comApagar' | 'comSalvar' | 'comPessoas' | 'comSilenciar' | 'comPedirEntrada' | 'contatoLista' | 'chatTranscrever' | 'chatTranscreverPrevia' | 'presencaPing' | 'reuniaoRecusar' | 'chatTranscricaoSalvar' | 'chatBuscar' | 'reuniaoMinhasAtivas' | 'reuniaoFalaEnviar' | 'reuniaoHistorico' | 'reuniaoFalas' | 'contatoSalvar' | 'contatoApagar' | 'comPedidos' | 'comDecidirEntrada' | 'reuniaoAtiva' | 'reuniaoIniciar' | 'reuniaoEncerrar' | 'reuniaoCanal' | 'reuniaoIce'>

export function conversasDemo(): ConversasApi {
  const reagir = (lista: Mensagem[], id: string, e: string) => {
    const m = lista.find((x) => x.id === id); if (!m) return
    if (m.reacoes[EU] === e) { const { [EU]: _x, ...r } = m.reacoes; m.reacoes = r } else m.reacoes = { ...m.reacoes, [EU]: e }
  }
  const grupo = (id: string) => { const c = achar(id); if (!c || c.tipo !== 'grupo') throw new Error('Grupo não encontrado.'); c.admins ??= [EU]; return c }
  const souAdmin = (c: Conv) => (c.admins ?? []).includes(EU)
  const aviso = (c: Conv, t: string) => { c.msgs.push(msg('sistema', t, 0)); avisar(c.id) }
  return {
    async grupoInfo(id) {
      const c = grupo(id)
      return { id, titulo: c.titulo ?? 'Grupo', descricao: c.descricao ?? null, criadoPor: EU, criadoEm: min(9000), soAdminsEnviam: !!c.soAdminsEnviam, soAdminsEditam: c.soAdminsEditam ?? true,
        euAdmin: souAdmin(c), membros: c.membros.map((e, i) => ({ email: e, admin: (c.admins ?? []).includes(e), entrouEm: c.entrou?.[e] ?? min(9000 - i) })) }
    },
    async grupoEditar(id, titulo, descricao) {
      const c = grupo(id); if ((c.soAdminsEditam ?? true) && !souAdmin(c)) throw new Error('Só administradores podem editar os dados do grupo.')
      if (titulo.trim().length < 2) throw new Error('O nome do grupo precisa ter entre 2 e 80 caracteres.')
      if (titulo.trim() !== c.titulo) aviso(c, `${nome(EU)} mudou o nome do grupo para "${titulo.trim()}"`)
      if ((descricao.trim() || null) !== (c.descricao ?? null)) aviso(c, `${nome(EU)} mudou a descrição do grupo`)
      c.titulo = titulo.trim(); c.descricao = descricao.trim() || null
    },
    async grupoRegras(id, r) {
      const c = grupo(id); if (!souAdmin(c)) throw new Error('Só administradores mudam as regras do grupo.')
      if (r.soAdminsEnviam !== undefined && r.soAdminsEnviam !== !!c.soAdminsEnviam) { c.soAdminsEnviam = r.soAdminsEnviam; aviso(c, `${nome(EU)} ${r.soAdminsEnviam ? 'definiu que só administradores enviam mensagens' : 'liberou o envio de mensagens para todos'}`) }
      if (r.soAdminsEditam !== undefined && r.soAdminsEditam !== (c.soAdminsEditam ?? true)) { c.soAdminsEditam = r.soAdminsEditam; aviso(c, `${nome(EU)} ${r.soAdminsEditam ? 'definiu que só administradores editam os dados do grupo' : 'liberou a edição dos dados do grupo para todos'}`) }
    },
    async grupoAdicionar(id, emails) {
      const c = grupo(id); if (!souAdmin(c)) throw new Error('Só administradores adicionam pessoas.')
      for (const e of emails) if (!c.membros.includes(e)) { c.membros.push(e); (c.entrou ??= {})[e] = new Date().toISOString(); aviso(c, `${nome(EU)} adicionou ${nome(e)}`) }
    },
    async grupoRemover(id, email) {
      const c = grupo(id); if (!souAdmin(c)) throw new Error('Só administradores removem pessoas.')
      if (email === EU) throw new Error('Para sair, use "Sair do grupo".')
      c.membros = c.membros.filter((m) => m !== email); c.admins = (c.admins ?? []).filter((m) => m !== email); aviso(c, `${nome(EU)} removeu ${nome(email)}`)
    },
    async grupoAdmin(id, email, admin) {
      const c = grupo(id); if (!souAdmin(c)) throw new Error('Só administradores mudam administradores.')
      const resto = (c.admins ?? []).filter((m) => m !== email)
      if (!admin && resto.length === 0) throw new Error('O grupo precisa de pelo menos um administrador.')
      c.admins = admin ? [...resto, email] : resto; aviso(c, `${nome(email)} ${admin ? 'agora é administrador' : 'não é mais administrador'}`)
    },
    async grupoSair(id) {
      const c = grupo(id); c.membros = c.membros.filter((m) => m !== EU); c.admins = (c.admins ?? []).filter((m) => m !== EU); aviso(c, `${nome(EU)} saiu`)
      if (!c.admins.length && c.membros[0]) { c.admins = [c.membros[0]]; aviso(c, `${nome(c.membros[0])} agora é administrador`) }
      const i = CONVERSAS.indexOf(c); if (i >= 0) CONVERSAS.splice(i, 1)
    },
    async chatLista() { return CONVERSAS.map(resumoConv).sort((a, b) => b.ultimaEm.localeCompare(a.ultimaEm)) },
    async chatPessoas() { return PESSOAS.map((p, i) => ({ ...p, vistoEm: p.email === EU || i % 2 ? new Date().toISOString() : new Date(Date.now() - 47 * 6e4).toISOString() })) },
    async chatMensagens(id) { return [...(achar(id)?.msgs ?? [])] },
    async chatEnviar(id, texto, anexo, respostaA) {
      const c = achar(id); if (!c) throw new Error('Conversa não encontrada.')
      if (c.tipo === 'grupo' && c.soAdminsEnviam && !(c.admins ?? []).includes(EU)) throw new Error('Só administradores podem enviar mensagens neste grupo.')
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
      const c: Conv = { id: `cv-g${++seq}`, tipo: 'grupo', titulo, admins: [EU], membros: [EU, ...emails], naoLidas: 0, ultima: null, ultimaEm: '', msgs: [msg('sistema', `${nome(EU)} criou o grupo "${titulo}"`, 0)] }
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
    async chatTranscreverPrevia(audio) {
      await new Promise((r) => setTimeout(r, 900))
      return audio.size > 0 ? { ok: true, texto: 'Na prévia, este texto mostra onde aparece a transcrição do seu áudio. No seu escritório, aqui vem exatamente o que você falou.' } : { ok: false, erro: 'Áudio vazio.' }
    },
    async chatTranscricaoSalvar() {},
    async presencaPing() {},
    async reuniaoRecusar() {},
    async chatTranscrever() { return { ok: false, configurada: false, erro: 'Na prévia, a transcrição fica desligada. No seu escritório, o áudio vira texto em segundos.' } },
    async chatBuscar(termo) {
      const t = termo.toLowerCase()
      return CONVERSAS.flatMap((c) => c.msgs.filter((m) => (m.texto ?? '').toLowerCase().includes(t) || (m.transcricao ?? '').toLowerCase().includes(t))
        .map((m) => ({ id: m.id, conversaId: c.id, autor: m.autor, texto: m.texto, transcricao: m.transcricao ?? null, anexo: m.anexo, criadoEm: m.criadoEm, tipo: c.tipo, titulo: c.titulo })))
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    },
    async reuniaoMinhasAtivas() { return [] },
    async reuniaoFalaEnviar() {},
    async reuniaoHistorico(conversa) { return conversa === 'cv-equipe' ? [{ id: 'rn-1', video: true, iniciadaPor: 'julia@silvaprado.exemplo.br', inicio: new Date(Date.now() - 864e5).toISOString(), fim: new Date(Date.now() - 864e5 + 18 * 6e4).toISOString(), participantes: [EU, 'julia@silvaprado.exemplo.br'], recusados: [], falas: 3 }, { id: 'rn-2', video: false, iniciadaPor: 'marcos@silvaprado.exemplo.br', inicio: new Date(Date.now() - 3 * 36e5).toISOString(), fim: new Date(Date.now() - 3 * 36e5 + 4e4).toISOString(), participantes: ['marcos@silvaprado.exemplo.br'], recusados: [], falas: 0 }] : [] },
    async reuniaoFalas() {
      const t0 = Date.now() - 864e5
      return [
        { autor: 'julia@silvaprado.exemplo.br', texto: 'Bom dia! Meta da semana: protocolar os 12 requerimentos de auxílio-acidente que estão com documentação completa.', faladoEm: new Date(t0 + 6e4).toISOString() },
        { autor: EU, texto: 'Combinado. Eu reviso as iniciais até quinta e o Marcos agenda as perícias.', faladoEm: new Date(t0 + 2 * 6e4).toISOString() },
        { autor: 'julia@silvaprado.exemplo.br', texto: 'Perfeito, sexta a gente confere o placar.', faladoEm: new Date(t0 + 3 * 6e4).toISOString() },
      ]
    },
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
    // prévia: a chamada é de verdade, mas só entre abas deste navegador (abra a prévia em outra aba para simular um colega)
    async reuniaoAtiva(conversa) { return demoAtiva && demoAtiva.conversa === conversa && Date.now() - demoAtiva.inicio < 36e5 ? { id: demoAtiva.id, video: demoAtiva.video, iniciadaPor: EU, inicio: new Date(demoAtiva.inicio).toISOString(), participantes: [EU] } : null },
    async reuniaoIniciar(conversa, video) { demoAtiva = { id: `demo-${conversa}`, conversa, video, inicio: Date.now() }; return demoAtiva.id },
    async reuniaoEncerrar() { demoAtiva = null },
    reuniaoCanal(id) { return canalLocal(id) },
    async reuniaoIce() { return [] },
  }
}
