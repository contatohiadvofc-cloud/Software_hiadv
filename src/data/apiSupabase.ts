import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js'
import type { Api, Achado, Area, Escritorio, Papel, Perfil } from './api'
import { CredencialInvalida, PrimeiroAcesso, SessaoExpirada } from './api'
import { mensagemLogin, normSenha } from './senha'
import { diaSP, horaSP, type ItemDia } from './seuDia'
import { lerItemAtencao, lerRodizio, ordenarAtencao, REGRAS_PADRAO, type Falha, type ParDuplicado, type RegrasAtencao } from './atencao'
import { destaquesDoCartao, type Quadro } from './quadro'
import { AREAS_PREVIDENCIARIAS, BENEFICIO_DEFS, type Ficha } from './ficha'
import type { CampoDef, TipoCampo } from './campos'
import type { Pessoa, Tarefa } from './tarefas'
import type { Situacao } from './central'
import { configCompleta } from '../lib/drive'
import { nomeTipo, type Compromisso } from './agenda'
import { nomeArquivoSeguro, type PacoteBiblioteca, type Agente, type EtapaEscritorio, type Integracao, type ItemBiblioteca, type Servico, type TipoBiblioteca } from './escritorio'
import { lerValor } from './financeiro'
import type { DadosDocumento } from './modelos'
import type { Relatorio } from './relatorios'
import type { Lead } from './atendimentos'
import type { RegistroHoras } from './horas'
import type { Portal } from './portal'
import type { GrupoAtualizacoes, MensagemCliente } from './suporte'
import type { Adesao, Indicacao, PlanoId } from './adesao'
import type { Candidatura, RespostaPublica, Vaga } from './recrutamento'
import { termoBusca, type ClienteFicha, type ClienteResumo } from './clientes'
import { caminhoAnexo, type Anexo, type Comunidade, type Conversa, type Mensagem, type PedidoEntrada, type Contato, type ResultadoBusca, type ChamadaAtiva, type ReuniaoPassada, type Fala, type GrupoInfo } from './conversas'
import { ICE, type Presenca, type Sinal } from './chamada'


function lerDadosVaga(x: Record<string, unknown>) {
  const arr = (k: string) => (Array.isArray(x[k]) ? (x[k] as string[]) : [])
  return { funcao: x.funcao as Vaga['funcao'], titulo: String(x.titulo ?? ''), regime: String(x.regime ?? ''), modalidade: String(x.modalidade ?? ''),
    jornada: (x.jornada as string) ?? '', cidade: (x.cidade as string) ?? '', salario: x.salario === null || x.salario === undefined ? null : Number(x.salario),
    salarioObs: (x.salario_obs as string) ?? '', mostrarSalario: x.mostrar_salario !== false, beneficios: arr('beneficios'), atividades: arr('atividades'),
    requisitos: arr('requisitos'), diferenciais: arr('diferenciais'), perguntas: arr('perguntas'), quantidade: Number(x.quantidade ?? 1), inscricoesAte: (x.inscricoes_ate as string) ?? null }
}

function lerEntrevista(x: unknown) {
  if (!x || typeof x !== 'object') return null
  const e = x as Record<string, unknown>
  return { modo: e.modo === 'presencial' ? 'presencial' as const : 'video' as const, data: String(e.data ?? ''), hora: String(e.hora ?? ''), duracao: Number(e.duracao ?? 45),
    local: (e.local as string) ?? '', link: (e.link as string) ?? '', com: (e.com as string) ?? '', levar: (e.levar as string) ?? '', gravacao: e.gravacao === true }
}
function lerProposta(x: unknown) {
  if (!x || typeof x !== 'object') return null
  const p = x as Record<string, unknown>
  return { cargo: String(p.cargo ?? ''), regime: String(p.regime ?? ''), salario: p.salario === null || p.salario === undefined ? null : Number(p.salario), bonus: (p.bonus as string) ?? '',
    jornada: (p.jornada as string) ?? '', local: (p.local as string) ?? '', beneficios: Array.isArray(p.beneficios) ? (p.beneficios as string[]) : [], inicio: String(p.inicio ?? ''),
    responderAte: String(p.responder_ate ?? ''), mensagem: (p.mensagem as string) ?? '' }
}
function lerAnexo(a: unknown): Anexo | null {
  if (!a || typeof a !== 'object') return null
  const x = a as Record<string, unknown>
  if (!x.path) return null
  return { path: String(x.path), nome: String(x.nome ?? 'arquivo'), tipo: String(x.tipo ?? 'application/octet-stream'), tamanho: Number(x.tamanho ?? 0),
    duracao: x.duracao != null ? Number(x.duracao) : undefined, largura: x.largura != null ? Number(x.largura) : undefined, altura: x.altura != null ? Number(x.altura) : undefined, texto: typeof x.texto === 'string' ? x.texto : undefined }
}
function lerMensagem(m: Record<string, unknown>): Mensagem {
  return { id: String(m.id), autor: String(m.autor), autorNome: (m.autor_nome as string) ?? null, autorEscritorio: (m.autor_esc as string) ?? null,
    texto: (m.texto as string) ?? null, anexo: lerAnexo(m.anexo), respostaA: (m.resposta_a as string) ?? null,
    reacoes: (m.reacoes as Record<string, string>) ?? {}, criadoEm: String(m.criado_em), editadoEm: (m.editado_em as string) ?? null, transcricao: (m.transcricao as string) ?? null }
}
function lerConversa(c: Record<string, unknown>): Conversa {
  const u = c.ultima as Record<string, unknown> | null
  return { id: String(c.id), tipo: c.tipo as Conversa['tipo'], titulo: (c.titulo as string) ?? null, membros: (c.membros as string[]) ?? [],
    ultima: u ? { autor: String(u.autor), texto: (u.texto as string) ?? null, anexo: lerAnexo(u.anexo), criadoEm: String(u.criado_em) } : null,
    naoLidas: Number(c.nao_lidas ?? 0), ultimaEm: String(c.ultima_em) }
}
function lerComunidade(c: Record<string, unknown>): Comunidade {
  const u = c.ultima as Record<string, unknown> | null
  return { id: String(c.id), nome: String(c.nome), descricao: (c.descricao as string) ?? null, areas: (c.areas as string[]) ?? null,
    soMasters: !!c.so_masters, quemPosta: c.quem_posta === 'moderadores' ? 'moderadores' : 'todos', anexos: c.anexos !== false, audios: c.audios !== false,
    ativa: c.ativa !== false, ordem: Number(c.ordem ?? 0),
    ultima: u ? { autorNome: (u.autor_nome as string) ?? null, texto: (u.texto as string) ?? null, anexo: lerAnexo(u.anexo), criadoEm: String(u.criado_em) } : null,
    naoLidas: Number(c.nao_lidas ?? 0), ultimaEm: String(c.ultima_em), podePostar: !!c.pode_postar, moderador: !!c.moderador,
    intervaloSeg: Number(c.intervalo_seg ?? 0), links: c.links !== false, aprovacao: !!c.aprovacao, participo: c.participo !== false,
    entrada: (c.entrada as Comunidade['entrada']) ?? null, pedidos: Number(c.pedidos ?? 0) }
}

function verificar<T>(r: { data: T; error: PostgrestError | null; status?: number }): T {
  if (r.error) {
    if (r.status === 401 || r.error.code === 'PGRST301' || /JWT/i.test(r.error.message)) throw new SessaoExpirada()
    throw new Error(r.error.message)
  }
  return r.data
}

const PAPEIS: Papel[] = ['code', 'master', 'colaborador', 'parceiro']

/** As funções do servidor devolvem {ok, erro}; erro vira mensagem na tela. */
function okOuErro(r: unknown): Record<string, unknown> {
  const v = (r ?? {}) as Record<string, unknown>
  if (v.ok === false) throw new Error(String(v.erro ?? 'Não foi possível concluir.'))
  return v
}

function lerRegras(d: Record<string, unknown> | null): RegrasAtencao {
  if (!d) return { ...REGRAS_PADRAO }
  return {
    paradoDias: Number(d.parado_dias ?? REGRAS_PADRAO.paradoDias), preparoDias: Number(d.preparo_dias ?? REGRAS_PADRAO.preparoDias),
    fatalAlertaDias: Number(d.fatal_alerta_dias ?? REGRAS_PADRAO.fatalAlertaDias),
    paradoIgnorar: Array.isArray(d.parado_ignorar) ? d.parado_ignorar.map(String) : [],
    rodizio: lerRodizio(d.rodizio),
  }
}

export function criarApiSupabase(url: string, chave: string): Api {
  const sb: SupabaseClient = createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true } })
  type RespEquipe = { ok: boolean; motivo?: string; restam?: number | null; erro?: string }
  async function funcaoEquipe(corpo: Record<string, unknown>): Promise<RespEquipe> {
    try {
      const r = await fetch(`${url}/functions/v1/Consutar_processos`, {
        method: 'POST',
        headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      return r.ok ? ((await r.json()) as RespEquipe) : { ok: false, motivo: 'indisponivel' }
    } catch { return { ok: false, motivo: 'indisponivel' } }
  }

  return {
    async temSessao() {
      const { data } = await sb.auth.getSession()
      return !!data.session
    },
    async entrar(email, senha) {
      const e = email.trim().toLowerCase()
      const s = normSenha(senha)
      // Confere no servidor da equipe (senha pessoal) e sincroniza a conta de acesso; depois entra.
      const j = await funcaoEquipe({ equipeEntrar: true, email: e, senha: s })
      if (!j.ok && j.motivo === 'primeiro_acesso') throw new PrimeiroAcesso()
      if (!j.ok && j.motivo !== 'indisponivel') throw new CredencialInvalida(mensagemLogin(j.motivo, j.restam))
      const { error } = await sb.auth.signInWithPassword({ email: e, password: s })
      if (error) {
        if (!j.ok && (error.status === 400 || /invalid/i.test(error.message))) throw new CredencialInvalida()
        throw new Error('Não foi possível entrar agora. Tente de novo em instantes.')
      }
    },
    async criarSenhaPessoal(email, mestra, nova) {
      const e = email.trim().toLowerCase()
      const j = await funcaoEquipe({ equipeNovaSenha: true, email: e, mestra: normSenha(mestra), nova: normSenha(nova) })
      if (!j.ok) throw new Error(j.motivo === 'fraca' && j.erro ? String(j.erro) : mensagemLogin(j.motivo ?? 'mestra', j.restam))
      const { error } = await sb.auth.signInWithPassword({ email: e, password: normSenha(nova) })
      if (error) throw new Error('Senha salva, mas a entrada falhou. Volte e entre com a nova senha.')
    },
    async sair() { await sb.auth.signOut() },
    aoMudarSessao(fn) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => fn(!!s))
      return () => data.subscription.unsubscribe()
    },
    async perfil(): Promise<Perfil> {
      const { data: u } = await sb.auth.getUser()
      const email = u.user?.email?.toLowerCase()
      if (!email) throw new SessaoExpirada()
      const eq = verificar(await sb.from('equipe').select('nome, papel, escritorio_id').eq('email', email).maybeSingle())
      const escId = (eq?.escritorio_id as string | null) ?? null
      let escritorioNome = ''
      if (escId) {
        const e = verificar(await sb.from('escritorios').select('nome').eq('id', escId).maybeSingle())
        escritorioNome = (e?.nome as string) ?? ''
      }
      const papel = PAPEIS.includes(eq?.papel as Papel) ? (eq?.papel as Papel) : null
      // o acesso de Coder vem do servidor (a coluna acesso_code não é legível pela equipe)
      let code = papel === 'code'
      if (!code) { const r = await sb.rpc('hiadv_sou_code'); code = !r.error && r.data === true }
      return { email, nome: (eq?.nome as string) || email, papel, code, escritorioId: escId, escritorioNome }
    },
    async escritorios(): Promise<Escritorio[]> {
      return (verificar(await sb.rpc('hiadv_escritorios_disponiveis')) as Escritorio[] | null) ?? []
    },
    async trocarEscritorio(id) {
      const r = verificar(await sb.rpc('hiadv_trocar_escritorio', { p_escritorio: id })) as { ok: boolean; erro?: string }
      if (!r?.ok) throw new Error(r?.erro ?? 'Não foi possível trocar de escritório.')
    },
    async areas(): Promise<Area[]> {
      const r = await sb.rpc('minhas_areas')
      // Enquanto a migração de áreas não estiver aplicada, a função não existe: tratamos como "sem áreas".
      if (r.error && /minhas_areas|PGRST202|does not exist/i.test(`${r.error.code} ${r.error.message}`)) return []
      return (verificar(r) as Area[] | null) ?? []
    },
    async busca(q): Promise<Achado[]> {
      const r = (verificar(await sb.rpc('busca_geral', { p_q: q })) as Array<Record<string, unknown>> | null) ?? []
      return r.map((x) => ({
        tipo: String(x.tipo ?? ''), titulo: String(x.titulo ?? ''), trecho: String(x.trecho ?? ''),
        clienteId: (x.cliente_id as string) ?? null, processoId: (x.processo_id as string) ?? null,
      }))
    },
    async itensDoDia(email): Promise<ItemDia[]> {
      const limite = new Date(Date.now() + 8 * 86400000).toISOString()
      const [tarefas, pericias, audiencias] = await Promise.all([
        sb.from('tarefas').select('id, tipo, titulo, detalhe, prazo, prazo_fatal, responsavel').eq('status', 'aberta').eq('responsavel', email).limit(200),
        sb.rpc('pericias_lista', { p_dias: 14 }),
        sb.from('audiencias').select('id, tipo, data_hora, local, responsavel, status').gte('data_hora', new Date(Date.now() - 86400000).toISOString()).lte('data_hora', limite).limit(100),
      ])
      const itens: ItemDia[] = []
      for (const t of verificar(tarefas) ?? []) {
        const prazo = (t.prazo_fatal ?? t.prazo) as string | null
        itens.push({ id: `t:${t.id}`, tipo: t.prazo_fatal ? 'prazo' : 'tarefa', titulo: t.titulo as string, sub: (t.detalhe as string) ?? '', dia: prazo, hora: null, quem: '' })
      }
      for (const p of (verificar(pericias) as Array<Record<string, unknown>> | null) ?? []) {
        if (p.status === 'cancelada' || p.status === 'realizada' || !p.data_hora) continue
        const d = new Date(p.data_hora as string)
        if (d.getTime() > Date.parse(limite)) continue
        itens.push({ id: `p:${p.id}`, tipo: 'pericia', titulo: `Perícia ${p.tipo ?? ''}`.trim(), sub: `${p.cliente ?? ''}${p.local ? ' · ' + p.local : ''}`, dia: diaSP(d), hora: horaSP(d), quem: (p.responsavel as string) ?? '' })
      }
      for (const a of verificar(audiencias) ?? []) {
        if (a.status === 'cancelada') continue
        const d = new Date(a.data_hora as string)
        itens.push({ id: `a:${a.id}`, tipo: 'audiencia', titulo: `Audiência ${a.tipo ?? ''}`.trim(), sub: (a.local as string) ?? '', dia: diaSP(d), hora: horaSP(d), quem: (a.responsavel as string) ?? '' })
      }
      return itens
    },
    async quadro(area): Promise<Quadro> {
      const [et, cs, cd] = await Promise.all([
        sb.from('fluxo_status').select('status, ordem, final, pede_motivo').eq('area', area).order('ordem'),
        sb.rpc('casos_quadro', { p_via: area }),
        sb.from('area_campos').select('chave, rotulo, tipo, opcoes, ordem, no_cartao').eq('area', area).eq('ativo', true).eq('no_cartao', true),
      ])
      const etapas = (verificar(et) ?? []).map((e) => ({ status: e.status as string, ordem: e.ordem as number, final: !!e.final, pedeMotivo: !!e.pede_motivo }))
      const casos = ((verificar(cs) as Array<Record<string, unknown>> | null) ?? []).map((c) => ({
        id: c.id as string, cliente: (c.cliente as string) ?? '', status: c.status as string, dias: Number(c.dias ?? 0),
        produto: (c.produto as string) ?? null, numeroCnj: (c.numero_cnj as string) ?? null,
        gateOk: Number(c.gate_ok ?? 0), gateTotal: Number(c.gate_total ?? 0),
      }))
      // Campos do cartão: lidos à parte e sem travar o quadro se falharem.
      const defs = cd.error ? [] : (cd.data ?? []).map((x): CampoDef => ({ chave: x.chave as string, rotulo: x.rotulo as string, tipo: x.tipo as TipoCampo, opcoes: (x.opcoes as string[] | null) ?? null, ordem: Number(x.ordem), noCartao: true }))
      if (defs.length && casos.length) {
        const porId = new Map<string, Record<string, unknown>>()
        for (let i = 0; i < casos.length; i += 150) {
          const r = await sb.from('casos').select('id, campos').in('id', casos.slice(i, i + 150).map((c) => c.id))
          if (r.error) break
          for (const x of r.data ?? []) porId.set(x.id as string, (x.campos as Record<string, unknown>) ?? {})
        }
        for (const c of casos) (c as { destaques?: unknown }).destaques = destaquesDoCartao(defs, porId.get(c.id))
      }
      return { etapas, casos }
    },
    async moverCaso(id, status, motivo) {
      verificar(await sb.rpc('caso_status', { p_caso: id, p_status: status, p_motivo: motivo ?? null }))
    },
    async ficha(id): Promise<Ficha> {
      const d = verificar(await sb.rpc('caso_detalhe', { p_caso: id })) as Record<string, any> | null
      const c = d?.caso as Record<string, any> | null
      if (!c) throw new Error('Caso não encontrado.')
      const area = String(c.via ?? '')
      const defs = (verificar(await sb.from('area_campos').select('chave, rotulo, tipo, opcoes, ordem, no_cartao').eq('area', area).eq('ativo', true).order('ordem')) ?? [])
        .map((x): CampoDef => ({ chave: x.chave as string, rotulo: x.rotulo as string, tipo: x.tipo as TipoCampo, opcoes: (x.opcoes as string[] | null) ?? null, ordem: Number(x.ordem), noCartao: !!x.no_cartao }))
      return {
        id, area, cliente: String(c.cliente ?? ''), status: String(c.status ?? ''),
        produto: (c.produto as string) ?? null, numeroCnj: (c.numero_cnj as string) ?? null,
        campos: (c.campos as Record<string, unknown>) ?? {}, defs,
        relato: (c.relato as string) ?? null,
        beneficio: AREAS_PREVIDENCIARIAS.includes(area) ? Object.fromEntries(BENEFICIO_DEFS.map((b) => [b.chave, c[b.chave] ?? null])) : null,
        checklist: ((d?.checklist as any[]) ?? []).map((g) => ({ item: String(g.item), rotulo: String(g.rotulo ?? g.item), feito: !!g.data, data: (g.data as string) ?? null })),
        historico: ((d?.historico as any[]) ?? []).map((h) => ({ evento: String(h.evento ?? ''), de: h.de ?? null, para: h.para ?? null, detalhe: h.detalhe ?? null, quem: h.quem ?? null, em: String(h.em ?? '') })),
        etapas: ((d?.status as any[]) ?? []).map((e, i) => ({ status: String(e.status), ordem: i + 1, final: !!e.final, pedeMotivo: !!e.pede_motivo })),
      }
    },
    async salvarCampos(id, campos) {
      const r = verificar(await sb.rpc('caso_campos_salvar', { p_caso: id, p_campos: campos })) as { ok: boolean; erro?: string; alterados?: number }
      if (!r?.ok) throw new Error(r?.erro ?? 'Não foi possível salvar.')
      return Number(r.alterados ?? 0)
    },
    async salvarBeneficio(id, dados) {
      const r = await sb.rpc('caso_beneficio_salvar', { p_caso: id, p: dados })
      if (r.error && /caso_beneficio_salvar|PGRST202/i.test(`${r.error.code} ${r.error.message}`)) throw new Error('Esta função ainda não foi ativada no servidor.')
      const v = verificar(r) as { ok: boolean; erro?: string; alterados?: number }
      if (!v?.ok) throw new Error(v?.erro ?? 'Não foi possível salvar.')
      return Number(v.alterados ?? 0)
    },
    async marcarChecklist(id, item, data) {
      verificar(await sb.rpc('caso_gate', { p_caso: id, p_item: item, p_data: data }))
    },
    async protocolar(id, numero, data) {
      okOuErro(verificar(await sb.rpc('caso_protocolar', { p_caso: id, p_numero: numero.trim(), p_data: data })))
    },
    async registrarExigencia(id, e) {
      const r = okOuErro(verificar(await sb.rpc('caso_exigencia', { p_caso: id, p_descricao: e.descricao.trim(), p_prazo_fatal: e.prazoFatal, p_folga: e.folga, p_responsavel: e.responsavel || null }))) as Record<string, unknown>
      if (r.ja) throw new Error('Essa exigência já foi registrada.')
      return { interno: String(r.interno ?? ''), fatal: String(r.fatal ?? e.prazoFatal), status: (r.status as string) ?? null }
    },
    async mudarVia(id, via, motivo) {
      const r = okOuErro(verificar(await sb.rpc('caso_mudar_via', { p_caso: id, p_via: via, p_motivo: motivo.trim() || null }))) as Record<string, unknown>
      return String(r.id)
    },
    async equipe(): Promise<Pessoa[]> {
      return (verificar(await sb.from('equipe').select('email, nome').order('nome')) ?? []).map((p) => ({ email: String(p.email), nome: String(p.nome || p.email) }))
    },
    async tarefas(pessoa): Promise<Tarefa[]> {
      let q = sb.from('tarefas').select('id, titulo, detalhe, prazo, prazo_fatal, responsavel').eq('status', 'aberta').limit(500)
      if (pessoa) q = q.eq('responsavel', pessoa)
      return (verificar(await q) ?? []).map((t) => ({
        id: t.id as string, titulo: t.titulo as string, detalhe: (t.detalhe as string) ?? null,
        prazo: ((t.prazo_fatal ?? t.prazo) as string | null) ?? null, fatal: !!t.prazo_fatal, responsavel: (t.responsavel as string) ?? null,
      }))
    },
    async criarTarefa(n) {
      verificar(await sb.rpc('tarefa_criar', { p_titulo: n.titulo.trim(), p_responsavel: n.responsavel || null, p_prazo: n.prazo || null, p_detalhe: n.detalhe.trim() || null, p_processo: n.processoId ?? null }))
    },
    async mudarTarefa(id, status) {
      verificar(await sb.rpc('tarefa_atualizar', { p_id: id, p_status: status }))
    },
    async clientes(termo): Promise<ClienteResumo[]> {
      let q = sb.from('clientes').select('id, nome, telefone, origem, criado_em').order('nome').limit(100)
      const t = termoBusca(termo)
      if (t.length >= 2) q = q.ilike('nome', `%${t}%`)
      return (verificar(await q) ?? []).map((c) => ({ id: c.id as string, nome: String(c.nome ?? ''), telefone: (c.telefone as string) ?? null, origem: (c.origem as string) ?? null, desde: (c.criado_em as string) ?? null }))
    },
    async cliente(id): Promise<ClienteFicha> {
      const [c, cs, ps, ts] = await Promise.all([
        sb.from('clientes').select('id, nome, telefone, origem, criado_em').eq('id', id).maybeSingle(),
        sb.from('casos').select('id, via, status, produto').eq('cliente_id', id).order('criado_em', { ascending: false }),
        sb.from('processos').select('id, numero_cnj, classe, orgao_julgador, ativo').eq('cliente_id', id).order('criado_em', { ascending: false }),
        sb.from('tarefas').select('id, titulo, detalhe, prazo, prazo_fatal, responsavel').eq('cliente_id', id).eq('status', 'aberta').limit(100),
      ])
      const cl = verificar(c)
      if (!cl) throw new Error('Cliente não encontrado.')
      return {
        cliente: { id, nome: String(cl.nome ?? ''), telefone: (cl.telefone as string) ?? null, origem: (cl.origem as string) ?? null, desde: (cl.criado_em as string) ?? null },
        casos: (verificar(cs) ?? []).map((x) => ({ id: x.id as string, area: String(x.via ?? ''), status: String(x.status ?? ''), produto: (x.produto as string) ?? null })),
        processos: (verificar(ps) ?? []).map((x) => ({ id: x.id as string, numeroCnj: (x.numero_cnj as string) ?? null, classe: (x.classe as string) ?? null, orgao: (x.orgao_julgador as string) ?? null, ativo: x.ativo !== false })),
        tarefas: (verificar(ts) ?? []).map((t) => ({ id: t.id as string, titulo: t.titulo as string, detalhe: (t.detalhe as string) ?? null, prazo: ((t.prazo_fatal ?? t.prazo) as string | null) ?? null, fatal: !!t.prazo_fatal, responsavel: (t.responsavel as string) ?? null })),
      }
    },
    async agenda(): Promise<Compromisso[]> {
      const [pe, au] = await Promise.all([sb.rpc('pericias_lista', { p_dias: 1 }), sb.rpc('audiencias_lista', { p_dias: 1 })])
      const fora: Compromisso[] = []
      const ok = (x: Record<string, unknown>) => x.data_hora && x.status !== 'cancelada' && x.status !== 'realizada'
      for (const p of ((verificar(pe) as Array<Record<string, unknown>> | null) ?? []).filter(ok)) {
        const d = new Date(p.data_hora as string)
        fora.push({ id: `p:${p.id}`, tipo: 'pericia', titulo: `Perícia ${nomeTipo(p.tipo as string, '').toLowerCase()}`.trim(), cliente: String(p.cliente ?? ''), clienteId: (p.cliente_id as string) ?? null, dia: diaSP(d), hora: horaSP(d), local: String(p.local ?? ''), quem: String(p.responsavel ?? '') })
      }
      for (const a of ((verificar(au) as Array<Record<string, unknown>> | null) ?? []).filter(ok)) {
        const d = new Date(a.data_hora as string)
        const local = [a.modo === 'virtual' ? 'Virtual' : null, a.local].filter(Boolean).join(' · ')
        fora.push({ id: `a:${a.id}`, tipo: 'audiencia', titulo: `Audiência ${nomeTipo(a.tipo as string, '').toLowerCase()}`.trim(), cliente: String(a.cliente ?? ''), clienteId: (a.cliente_id as string) ?? null, dia: diaSP(d), hora: horaSP(d), local, quem: String(a.responsavel ?? '') })
      }
      return fora
    },
    async salvarRelato(id, relato) {
      const r = await sb.rpc('caso_relato_salvar', { p_caso: id, p_relato: relato })
      if (r.error && /caso_relato_salvar|PGRST202/i.test(`${r.error.code} ${r.error.message}`)) throw new Error('Esta função ainda não foi ativada no servidor.')
      okOuErro(verificar(r))
    },
    async biblioteca(): Promise<ItemBiblioteca[]> {
      const r = await sb.from('biblioteca').select('id, tipo, titulo, area, peca, conteudo, link, arquivo, arquivo_nome, tamanho, criado_por, criado_em').eq('ativo', true).order('titulo').limit(1000)
      if (r.error && /biblioteca|42P01|PGRST205/i.test(`${r.error.code} ${r.error.message}`)) return []
      return (verificar(r) ?? []).map((b) => ({
        id: b.id as string, tipo: b.tipo as TipoBiblioteca, titulo: b.titulo as string, area: (b.area as string) ?? null, peca: (b.peca as string) ?? null,
        conteudo: (b.conteudo as string) ?? null, link: (b.link as string) ?? null, arquivo: (b.arquivo as string) ?? null,
        arquivoNome: (b.arquivo_nome as string) ?? null, tamanho: (b.tamanho as number) ?? null, criadoPor: (b.criado_por as string) ?? null, criadoEm: String(b.criado_em),
      }))
    },
    async salvarBiblioteca(id, item, arquivo) {
      let extra: Record<string, unknown> = {}
      if (arquivo) {
        const p = await this.perfil()
        if (!p.escritorioId) throw new Error('Escritório não definido.')
        const caminho = `${p.escritorioId}/${crypto.randomUUID()}-${nomeArquivoSeguro(arquivo.name)}`
        const up = await sb.storage.from('biblioteca').upload(caminho, arquivo, { contentType: arquivo.type || undefined, upsert: false })
        if (up.error) throw new Error('Não foi possível enviar o arquivo.')
        extra = { arquivo: caminho, arquivo_nome: arquivo.name, tamanho: arquivo.size }
      }
      okOuErro(verificar(await sb.rpc('biblioteca_salvar', { p_id: id, p: { ...item, ...extra } })))
    },
    async retirarBiblioteca(id) { okOuErro(verificar(await sb.rpc('biblioteca_retirar', { p_id: id }))) },
    async linkArquivo(caminho) {
      const r = await sb.storage.from('biblioteca').createSignedUrl(caminho, 300)
      if (r.error || !r.data) throw new Error('Não foi possível abrir o arquivo.')
      return r.data.signedUrl
    },
    async integracoes(): Promise<Integracao[]> {
      const r = await sb.rpc('integracoes_listar')
      if (r.error && /integracoes_listar|PGRST202/i.test(`${r.error.code} ${r.error.message}`)) return []
      return ((verificar(r) as Array<Record<string, unknown>> | null) ?? []).map((i) => ({
        servico: i.servico as Servico, ativo: !!i.ativo, modo: (i.modo as string) ?? null, limiteMensal: i.limite_mensal == null ? null : Number(i.limite_mensal),
        temChave: !!i.tem_chave, chaveFinal: (i.chave_final as string) ?? null, configuradoEm: (i.configurado_em as string) ?? null, configuradoPor: (i.configurado_por as string) ?? null,
      }))
    },
    async salvarIntegracao(servico, ativo, modo, limite) {
      okOuErro(verificar(await sb.rpc('integracao_salvar', { p_servico: servico, p_ativo: ativo, p_modo: modo ?? null, p_limite: limite ?? null })))
    },
    async salvarChave(servico, chave) {
      const r = okOuErro(verificar(await sb.rpc('integracao_chave_salvar', { p_servico: servico, p_chave: chave })))
      return String(r.chave_final ?? '')
    },
    async removerChave(servico) { okOuErro(verificar(await sb.rpc('integracao_chave_remover', { p_servico: servico }))) },
    async agentes(): Promise<Agente[]> {
      const r = await sb.rpc('agentes_listar')
      if (r.error && /agentes_listar|PGRST202/i.test(`${r.error.code} ${r.error.message}`)) return []
      return ((verificar(r) as Array<Record<string, unknown>> | null) ?? []).map((a) => ({
        agente: a.agente as string, nome: a.nome as string, descricao: a.descricao as string, areas: (a.areas as string[]) ?? null,
        precisa: (a.precisa as string[]) ?? [], usaModelo: !!a.usa_modelo, semCusto: !!a.sem_custo, ativo: !!a.ativo, etapas: (a.etapas as string[]) ?? [],
        parametros: (a.parametros as Record<string, unknown>) ?? {},
        modeloId: (a.modelo_id as string) ?? null, modeloTitulo: (a.modelo_titulo as string) ?? null,
      }))
    },
    async configurarAgente(agente, ativo, etapas, modeloId, parametros) {
      okOuErro(verificar(await sb.rpc('agente_configurar', { p_agente: agente, p_ativo: ativo, p_etapas: etapas, p_modelo: modeloId, p_parametros: parametros ?? {} })))
    },
    async atencao() {
      const r = await sb.rpc('atencao_listar')
      if (r.error && /function .*does not exist|Could not find the function/i.test(r.error.message)) return []
      return ordenarAtencao(((verificar(r) as Record<string, unknown>[] | null) ?? []).map(lerItemAtencao))
    },
    async criarPreparo(evento, id) {
      const r = okOuErro(verificar(await sb.rpc('preparo_criar', { p_evento: evento, p_id: id }))) as Record<string, unknown>
      return { ja: r.ja === true, prazo: String(r.prazo ?? '') }
    },
    async regrasAtencao() {
      const r = await sb.rpc('regras_obter')
      if (r.error) return { ...REGRAS_PADRAO }
      return lerRegras(r.data as Record<string, unknown> | null)
    },
    async salvarRegrasAtencao(x) {
      const r = verificar(await sb.rpc('regras_salvar', { p: { parado_dias: x.paradoDias, preparo_dias: x.preparoDias, fatal_alerta_dias: x.fatalAlertaDias, parado_ignorar: x.paradoIgnorar, rodizio: x.rodizio } }))
      return lerRegras(r as Record<string, unknown> | null)
    },
    async duplicados() {
      const r = await sb.rpc('duplicidades_listar')
      if (r.error && /function .*does not exist|Could not find the function/i.test(r.error.message)) return []
      return ((verificar(r) as ParDuplicado[] | null) ?? []).map((p) => ({ a: { id: String(p.a.id), nome: String(p.a.nome ?? '') }, b: { id: String(p.b.id), nome: String(p.b.nome ?? '') }, motivos: (p.motivos ?? []).map(String) }))
    },
    async ignorarDuplicado(a, b) { okOuErro(verificar(await sb.rpc('duplicidade_ignorar', { p_a: a, p_b: b }))) },
    async cargaEquipe() {
      const r = await sb.rpc('carga_equipe')
      if (r.error) return []
      return ((r.data as Record<string, unknown>[] | null) ?? []).map((x) => ({ email: String(x.email), nome: String(x.nome ?? x.email), tarefas: Number(x.tarefas ?? 0), casos: Number(x.casos ?? 0), total: Number(x.total ?? 0) }))
    },
    async publicacoes(dias, soPublicacoes) {
      const d = verificar(await sb.rpc('hiadv_publicacoes', { p_dias: dias, p_so_publicacoes: soPublicacoes })) as Record<string, unknown>[] | null
      return (d ?? []).map((x) => ({
        id: Number(x.id), quando: String(x.data_hora), publicacao: x.publicacao === true, titulo: String(x.titulo ?? ''), texto: (x.texto as string) ?? null,
        processoId: String(x.processo_id), numeroCnj: (x.numero_cnj as string) ?? null, clienteId: (x.cliente_id as string) ?? null, cliente: (x.cliente as string) ?? null,
        tarefa: x.tarefa_id ? { id: String(x.tarefa_id), prazo: (x.tarefa_prazo as string) ?? null, feita: x.tarefa_status !== 'aberta' } : null,
      }))
    },
    async oabs() {
      const d = (verificar(await sb.rpc('hiadv_oabs')) ?? {}) as { oabs?: string[]; da_equipe?: { nome: string; oab: string }[] }
      return { oabs: d.oabs ?? [], daEquipe: d.da_equipe ?? [] }
    },
    async salvarOabs(oabs) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_oabs_salvar', { p_oabs: oabs })))
      return (r.oabs as string[]) ?? []
    },
    async calcularPrazo(p) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_prazo', { p_inicio: p.inicio, p_dias: p.dias, p_contagem: p.contagem, p_justica: p.justica, p_disponibilizacao: p.disponibilizacao })))
      return { publicacao: String(r.publicacao), fim: String(r.fim), coberturaAte: (r.cobertura_ate as string) ?? null, pulados: (r.pulados as { dia: string; nome: string }[]) ?? [] }
    },
    async finLista(de, ate) {
      const d = verificar(await sb.rpc('hiadv_fin_lista', { p_de: de, p_ate: ate })) as Record<string, unknown>[] | null
      return (d ?? []).map((x) => ({
        id: String(x.id), sentido: x.sentido as 'entrada' | 'saida', etiqueta: String(x.etiqueta ?? ''), titulo: String(x.titulo ?? ''), descricao: (x.descricao as string) ?? null,
        valor: Number(x.valor), vencimento: String(x.vencimento), pagoEm: (x.pago_em as string) ?? null, clienteId: (x.cliente_id as string) ?? null,
        cliente: (x.cliente as string) ?? null, telefone: (x.telefone as string) ?? null, honorarioId: (x.honorario_id as string) ?? null,
      }))
    },
    async finLancar(l) {
      okOuErro(verificar(await sb.rpc('hiadv_fin_lancar', { p: { sentido: l.sentido, titulo: l.titulo.trim(), valor: lerValor(l.valor), vencimento: l.vencimento, etiqueta: l.etiqueta.trim() || null, cliente: l.cliente, pago: l.pago } })))
    },
    async finBaixar(id, pagoEm) {
      okOuErro(verificar(await sb.rpc('hiadv_fin_baixar', { p_id: id, p_pago_em: pagoEm })))
    },
    async honorarioCriar(h) {
      okOuErro(verificar(await sb.rpc('hiadv_honorario_criar', { p: {
        cliente: h.cliente, caso: h.caso, tipo: h.tipo, descricao: h.descricao.trim() || null,
        valor_fixo: h.tipo === 'exito' ? null : lerValor(h.valorFixo), parcelas: h.tipo === 'exito' ? null : Number(h.parcelas),
        primeiro_vencimento: h.tipo === 'exito' ? null : h.primeiroVencimento, percentual_exito: h.tipo === 'fixo' ? null : lerValor(h.percentualExito),
      } })))
    },
    async honorarioExito(id, valorRecebido) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_honorario_exito', { p_honorario: id, p_valor_recebido: valorRecebido })))
      return Number(r.valor)
    },
    async honorariosCliente(clienteId) {
      const d = (verificar(await sb.rpc('hiadv_honorarios_cliente', { p_cliente: clienteId })) ?? []) as Record<string, unknown>[]
      return d.map((h) => ({
        id: String(h.id), tipo: h.tipo as 'fixo' | 'exito' | 'misto', descricao: (h.descricao as string) ?? null, valorFixo: h.valor_fixo == null ? null : Number(h.valor_fixo),
        parcelas: h.parcelas == null ? null : Number(h.parcelas), percentualExito: h.percentual_exito == null ? null : Number(h.percentual_exito),
        status: h.status as 'ativo' | 'encerrado', criadoEm: String(h.criado_em), recebido: Number(h.recebido), aReceber: Number(h.a_receber), atrasado: Number(h.atrasado),
      }))
    },
    async documentoDados(clienteId, casoId) {
      return verificar(await sb.rpc('hiadv_documento_dados', { p_cliente: clienteId, p_caso: casoId })) as DadosDocumento
    },
    async salvarDadosCliente(clienteId, dados) {
      okOuErro(verificar(await sb.rpc('hiadv_cliente_dados_salvar', { p_cliente: clienteId, p: dados })))
    },
    async arquivoBiblioteca(caminho) {
      const r = await sb.storage.from('biblioteca').download(caminho)
      if (r.error || !r.data) throw new Error('Não foi possível baixar o modelo.')
      return r.data.arrayBuffer()
    },
    async relatorio(dias) {
      return verificar(await sb.rpc('hiadv_relatorio', { p_dias: dias })) as Relatorio
    },
    async ativarArea(area, ativa) {
      okOuErro(verificar(await sb.rpc('area_ativar', { p_area: area, p_ativa: ativa })))
    },
    async criarCliente(c) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_cliente_criar', { p: c })))
      return { id: String(r.id), ja: r.ja === true }
    },
    async criarCaso(c) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_caso_criar', {
        p_cliente: c.cliente, p_area: c.area, p_produto: c.produto, p_relato: c.relato.trim() || null, p_responsavel: c.responsavel,
      })))
      return String(r.id)
    },
    async importarClientes(itens, simular) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_clientes_importar', { p_itens: itens, p_simular: simular })))
      return {
        simulado: r.simulado === true, novos: Number(r.novos ?? 0), existentes: Number(r.existentes ?? 0), erros: Number(r.erros ?? 0),
        linhas: ((r.linhas as Record<string, unknown>[]) ?? []).map((l) => ({ linha: Number(l.linha), nome: String(l.nome ?? ''), resultado: l.resultado as 'novo' | 'ja' | 'erro', motivo: (l.motivo as string) ?? null })),
      }
    },
    async leads() {
      const d = (verificar(await sb.rpc('hiadv_leads')) ?? []) as Record<string, unknown>[]
      return d.map((x): Lead => ({
        id: String(x.id), nome: String(x.nome), telefone: (x.telefone as string) ?? null, origem: (x.origem as string) ?? null, area: (x.area as string) ?? null,
        assunto: (x.assunto as string) ?? null, etapa: x.etapa as Lead['etapa'], motivoPerda: (x.motivo_perda as string) ?? null, responsavel: (x.responsavel as string) ?? null,
        proximoContato: (x.proximo_contato as string) ?? null, clienteId: (x.cliente_id as string) ?? null, criadoEm: String(x.criado_em),
      }))
    },
    async salvarLead(id, l) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_lead_salvar', { p_id: id, p: {
        nome: l.nome.trim(), telefone: l.telefone, origem: l.origem, area: l.area || null, assunto: l.assunto, responsavel: l.responsavel || null, proximo_contato: l.proximoContato || null,
      } })))
      return String(r.id)
    },
    async etapaLead(id, etapa, motivo) {
      okOuErro(verificar(await sb.rpc('hiadv_lead_etapa', { p_id: id, p_etapa: etapa, p_motivo: motivo ?? null })))
    },
    async converterLead(id, area, produto) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_lead_converter', { p_id: id, p_area: area, p_produto: produto })))
      return { cliente: String(r.cliente), caso: (r.caso as string) ?? null }
    },
    async horasCliente(clienteId) {
      const d = (verificar(await sb.rpc('hiadv_horas_cliente', { p_cliente: clienteId })) ?? []) as Record<string, unknown>[]
      return d.map((x): RegistroHoras => ({ id: String(x.id), email: String(x.email), nome: (x.nome as string) ?? null, descricao: (x.descricao as string) ?? null,
        dia: String(x.dia), minutos: Number(x.minutos), minha: x.minha === true }))
    },
    async lancarHoras(h) {
      okOuErro(verificar(await sb.rpc('hiadv_horas_lancar', { p: { cliente: h.cliente, caso: h.caso, descricao: h.descricao, dia: h.dia, minutos: h.minutos } })))
    },
    async removerHoras(id) {
      okOuErro(verificar(await sb.rpc('hiadv_horas_remover', { p_id: id })))
    },
    async portalGerar(clienteId) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_portal_gerar', { p_cliente: clienteId })))
      return { token: String(r.token), expiraEm: String(r.expira_em) }
    },
    async portalSituacao(clienteId) {
      const r = (verificar(await sb.rpc('hiadv_portal_situacao', { p_cliente: clienteId })) ?? {}) as Record<string, unknown>
      return { ativo: r.ativo === true, expiraEm: (r.expira_em as string) ?? null, acessos: Number(r.acessos ?? 0), ultimoAcesso: (r.ultimo_acesso as string) ?? null }
    },
    async portalRevogar(clienteId) {
      okOuErro(verificar(await sb.rpc('hiadv_portal_revogar', { p_cliente: clienteId })))
    },
    async portal(token) {
      const r = (verificar(await sb.rpc('hiadv_portal', { p_token: token })) ?? {}) as Record<string, unknown>
      if (r.ok !== true) return null
      const e = (r.escritorio ?? {}) as Record<string, unknown>
      return {
        escritorio: { nome: String(e.nome ?? ''), whatsapp: (e.whatsapp as string) ?? null }, cliente: String(r.cliente ?? ''), expiraEm: String(r.expira_em ?? ''),
        casos: ((r.casos as Record<string, unknown>[]) ?? []).map((c) => ({ area: String(c.area), fase: String(c.fase), desde: (c.desde as string) ?? null, concluido: c.concluido === true })),
        compromissos: ((r.compromissos as Record<string, unknown>[]) ?? []).map((c) => ({ tipo: String(c.tipo), quando: String(c.quando), local: (c.local as string) ?? null })),
      } satisfies Portal
    },
    async contatoEscritorio() {
      const r = (verificar(await sb.rpc('hiadv_escritorio_contato')) ?? {}) as Record<string, unknown>
      return { nome: String(r.nome ?? ''), cidade: (r.cidade as string) ?? null, whatsapp: (r.whatsapp as string) ?? null }
    },
    async salvarContatoEscritorio(cidade, whatsapp) {
      okOuErro(verificar(await sb.rpc('hiadv_escritorio_contato_salvar', { p_cidade: cidade, p_whatsapp: whatsapp })))
    },
    async agendaLinkGerar() {
      const r = okOuErro(verificar(await sb.rpc('hiadv_agenda_link_gerar')))
      return `${url}/functions/v1/agenda?t=${String(r.token)}`
    },
    async agendaLinkExiste() {
      return verificar(await sb.rpc('hiadv_agenda_link_existe')) === true
    },
    async vagas() {
      const d = (verificar(await sb.rpc('rh_vaga_lista')) ?? []) as Record<string, unknown>[]
      return d.map((x): Vaga => ({ ...lerDadosVaga(x), id: String(x.id), slug: String(x.slug), escritorioSlug: (x.escritorio_slug as string) ?? null,
        status: x.status as Vaga['status'], total: Number(x.total ?? 0), novos: Number(x.novos ?? 0), criadoEm: String(x.criado_em) }))
    },
    async vagaSalvar(v) {
      const r = okOuErro(verificar(await sb.rpc('rh_vaga_salvar', { p: { id: v.id ?? null, funcao: v.funcao, titulo: v.titulo, regime: v.regime, modalidade: v.modalidade,
        jornada: v.jornada, cidade: v.cidade, salario: v.salario ?? '', salario_obs: v.salarioObs, mostrar_salario: v.mostrarSalario, beneficios: v.beneficios,
        atividades: v.atividades, requisitos: v.requisitos, diferenciais: v.diferenciais, perguntas: v.perguntas, quantidade: v.quantidade, inscricoes_ate: v.inscricoesAte ?? '' } })))
      return String((r as { id: string }).id)
    },
    async vagaStatus(id, status) { okOuErro(verificar(await sb.rpc('rh_vaga_status', { p_id: id, p_status: status }))) },
    async candidaturas(vaga) {
      const d = (verificar(await sb.rpc('rh_candidaturas_da_vaga', { p_vaga: vaga })) ?? []) as Record<string, unknown>[]
      return d.map((x): Candidatura => ({ id: String(x.id), nome: String(x.nome), email: String(x.email), whatsapp: String(x.whatsapp), cidade: (x.cidade as string) ?? null,
        uf: (x.uf as string) ?? null, linkedin: (x.linkedin as string) ?? null, curriculoPath: (x.curriculo_path as string) ?? null,
        respostas: (x.respostas as Record<string, string>) ?? {}, bancoTalentos: x.banco_talentos === true, etapa: x.etapa as Candidatura['etapa'],
        nota: x.nota === null || x.nota === undefined ? null : Number(x.nota), obs: (x.obs as string) ?? null, criadoEm: String(x.criado_em),
        entrevista: lerEntrevista(x.entrevista), proposta: lerProposta(x.proposta), resposta: (x.resposta as Candidatura['resposta']) ?? null, token: (x.token as string) ?? null }))
    },
    async candidaturaAtualizar(id, m) { okOuErro(verificar(await sb.rpc('rh_candidatura_atualizar', { p_id: id, p_etapa: m.etapa ?? null, p_nota: m.nota ?? null, p_obs: m.obs ?? null }))) },
    async candidaturaApagar(id) { okOuErro(verificar(await sb.rpc('rh_candidatura_apagar', { p_id: id }))) },
    async curriculoLink(path) {
      const r = await sb.storage.from('curriculos').createSignedUrl(path, 300)
      if (r.error || !r.data) throw new Error('Não foi possível abrir o currículo.')
      return r.data.signedUrl
    },
    async entrevistaSalvar(id, e) { okOuErro(verificar(await sb.rpc('rh_entrevista_salvar', { p_id: id, p: e }))) },
    async propostaSalvar(id, p) {
      okOuErro(verificar(await sb.rpc('rh_proposta_salvar', { p_id: id, p: { cargo: p.cargo, regime: p.regime, salario: p.salario, bonus: p.bonus, jornada: p.jornada, local: p.local,
        beneficios: p.beneficios, inicio: p.inicio, responder_ate: p.responderAte, mensagem: p.mensagem } })))
    },
    async respostaVer(token) {
      const x = verificar(await sb.rpc('rh_resposta_ver', { p_token: token })) as Record<string, unknown> | null
      if (!x) return null
      return { nome: String(x.nome), escritorio: String(x.escritorio), vaga: String(x.vaga), entrevista: lerEntrevista(x.entrevista), proposta: lerProposta(x.proposta),
        resposta: (x.resposta as RespostaPublica['resposta']) ?? null, etapa: x.etapa as RespostaPublica['etapa'] }
    },
    async respostaEnviar(token, tipo, msg) { okOuErro(verificar(await sb.rpc('rh_resposta_enviar', { p_token: token, p_tipo: tipo, p_msg: msg }))) },
    async vagaPublica(escritorio, vaga) {
      const x = verificar(await sb.rpc('rh_vaga_publica', { p_escritorio: escritorio, p_vaga: vaga })) as Record<string, unknown> | null
      if (!x) return null
      return { ...lerDadosVaga(x), id: String(x.id), escritorio: String(x.escritorio), cidadeEscritorio: (x.cidade_escritorio as string) ?? null, aberta: x.aberta === true }
    },
    async candidaturaEnviar(vaga, f, curriculo) {
      let path: string | null = null
      if (curriculo) {
        path = `${vaga}/${crypto.randomUUID()}.pdf`
        const up = await sb.storage.from('curriculos').upload(path, curriculo, { contentType: 'application/pdf', upsert: false })
        if (up.error) throw new Error('Não foi possível enviar o currículo. Tente de novo.')
      }
      okOuErro(verificar(await sb.rpc('rh_candidatura_enviar', { p: { vaga, nome: f.nome, email: f.email, whatsapp: f.whatsapp, cidade: f.cidade, uf: f.uf,
        linkedin: f.linkedin, respostas: f.respostas, consentimento: f.consentimento, banco_talentos: f.bancoTalentos, curriculo_path: path } })))
    },
    async adesaoVagas() {
      return Number(verificar(await sb.rpc('hiadv_adesao_vagas')) ?? 0)
    },
    async adesaoEnviar(p) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_adesao_enviar', { p: {
        nome: p.nome, email: p.email, whatsapp: p.whatsapp, oab: p.oab, escritorio: p.escritorio, cidade: p.cidade, uf: p.uf,
        plano: p.plano, recomendado: p.recomendado, respostas: p.respostas, ref: p.ref, consentimento: p.consentimento,
      } })))
      return { lista: r.lista === true }
    },
    async indicacaoCodigo() {
      return String(okOuErro(verificar(await sb.rpc('hiadv_indicacao_link'))).codigo)
    },
    async indicacoes() {
      const d = (verificar(await sb.rpc('hiadv_indicacoes')) ?? []) as Record<string, unknown>[]
      return d.map((x): Indicacao => ({ id: String(x.id), primeiroNome: String(x.primeiro_nome ?? ''), plano: x.plano as Indicacao['plano'], status: x.status as Indicacao['status'],
        cortesia: x.cortesia as Indicacao['cortesia'], criadoEm: String(x.criado_em), quem: (x.quem as string) ?? null, minha: x.minha === true }))
    },
    async adesoes() {
      const d = (verificar(await sb.rpc('hiadv_adesoes')) ?? []) as Record<string, unknown>[]
      return d.map((x): Adesao => ({
        id: String(x.id), nome: String(x.nome), email: String(x.email), whatsapp: String(x.whatsapp), oab: (x.oab as string) ?? null, escritorio: (x.escritorio as string) ?? null,
        cidade: (x.cidade as string) ?? null, uf: (x.uf as string) ?? null, plano: x.plano as Adesao['plano'], recomendado: (x.recomendado as Adesao['recomendado']) ?? null,
        respostas: (x.respostas as Adesao['respostas']) ?? {}, indicadorEmail: (x.indicador_email as string) ?? null, indicadorEscritorio: (x.indicador_escritorio as string) ?? null,
        status: x.status as Adesao['status'], fundador: x.fundador === true, cortesia: x.cortesia as Adesao['cortesia'], obs: (x.obs as string) ?? null, criadoEm: String(x.criado_em),
      }))
    },
    async adesaoAtualizar(id, status, extra) {
      okOuErro(verificar(await sb.rpc('hiadv_adesao_atualizar', { p_id: id, p_status: status, p_fundador: extra?.fundador ?? null, p_cortesia: extra?.cortesia ?? null, p_obs: extra?.obs ?? null })))
    },
    async adesaoPlano(id, plano) {
      okOuErro(verificar(await sb.rpc('hiadv_adesao_plano', { p_id: id, p_plano: plano })))
    },
    async meusRecursos() {
      const r = await sb.rpc('hiadv_meus_recursos')
      if (r.error && /hiadv_meus_recursos|PGRST202/i.test(`${r.error.code} ${r.error.message}`)) return null
      const d = verificar(r) as Record<string, unknown> | null
      if (!d || typeof d !== 'object' || Array.isArray(d) || !d.plano) return null
      return { plano: d.plano as PlanoId, situacao: (d.situacao as Situacao) ?? null, testeAte: (d.teste_ate as string) ?? null, pagoAte: (d.pago_ate as string) ?? null, recursos: (d.recursos as string[]) ?? [] }
    },
    async centralEscritorios() {
      const d = (verificar(await sb.rpc('hiadv_central_escritorios')) ?? []) as Record<string, any>[]
      return d.map((e) => ({
        id: e.id, nome: e.nome, cidade: e.cidade ?? null, ativo: !!e.ativo, oabsMaster: e.oabs_master ?? [],
        plano: e.plano ?? null, situacao: e.situacao ?? null, fundador: !!e.fundador, testeAte: e.teste_ate ?? null, pagoAte: e.pago_ate ?? null, obs: e.obs ?? null,
        limites: { masters: e.limites?.masters ?? null, colaboradores: e.limites?.colaboradores ?? null, oabs: e.limites?.oabs ?? null, iaMensal: e.limites?.ia_mensal ?? null },
        uso: { masters: Number(e.uso?.masters ?? 0), colaboradores: Number(e.uso?.colaboradores ?? 0), oabs: Number(e.uso?.oabs ?? 0), iaMes: Number(e.uso?.ia_mes ?? 0) },
        ajustes: Number(e.ajustes ?? 0),
        preco: e.preco == null ? null : Number(e.preco), saude: e.saude == null ? null : Number(e.saude),
        ultimoAcesso: e.ultimo_acesso ?? null, masterNome: e.master_nome ?? null, casos: Number(e.casos ?? 0),
      }))
    },
    async centralEscritorio(id) {
      const d = verificar(await sb.rpc('hiadv_central_escritorio', { p_id: id })) as Record<string, any>
      return {
        ajustes: (d.ajustes ?? []).map((a: any) => ({ recurso: a.recurso, valor: a.valor, validoAte: a.valido_ate ?? null })),
        recursos: (d.recursos ?? []).map((a: any) => ({ recurso: a.recurso, noPlano: !!a.no_plano, liberado: !!a.liberado })),
        pessoas: (d.pessoas ?? []).map((p: any) => ({ email: p.email, nome: p.nome, papel: p.papel, bloqueios: (p.bloqueios ?? []).map((b: any) => ({ recurso: b.recurso, validoAte: b.valido_ate ?? null })) })),
        historico: (d.historico ?? []).map((h: any) => ({ quando: h.quando, quem: h.quem, acao: h.acao })),
      }
    },
    async centralAssinatura(id, f) {
      okOuErro(verificar(await sb.rpc('hiadv_central_assinatura', { p_id: id, p: {
        plano: f.plano, situacao: f.situacao, fundador: f.fundador, teste_ate: f.testeAte || null, pago_ate: f.pagoAte || null, obs: f.obs,
        masters: f.masters || null, colaboradores: f.colaboradores || null, oabs: f.oabs || null, ia_mensal: f.iaMensal || null } })))
    },
    async centralAjuste(id, recurso, valor, validoAte) {
      okOuErro(verificar(await sb.rpc('hiadv_central_ajuste', { p_id: id, p_recurso: recurso, p_valor: valor, p_valido_ate: validoAte })))
    },
    async pessoaAjuste(id, email, recurso, bloquear, validoAte) {
      okOuErro(verificar(await sb.rpc('hiadv_pessoa_ajuste', { p_id: id, p_email: email, p_recurso: recurso, p_bloquear: bloquear, p_valido_ate: validoAte })))
    },
    async iaGerar(p) {
      const { data } = await sb.auth.getSession()
      if (!data.session) throw new SessaoExpirada()
      let r: Response
      try {
        r = await fetch(`${url}/functions/v1/ia`, { method: 'POST', headers: { apikey: chave, Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
      } catch { throw new Error('Sem conexão com o servidor. Tente de novo.') }
      const d = (await r.json().catch(() => null)) as { ok?: boolean; texto?: string; erro?: string } | null
      if (!d?.ok) throw new Error(d?.erro ?? 'A IA não conseguiu responder agora.')
      return String(d.texto ?? '')
    },
    async iaUsoMes() {
      const r = await sb.rpc('hiadv_ia_uso_mes')
      if (r.error) return null
      const d = r.data as { usados?: number; limite?: number | null } | null
      return d ? { usados: Number(d.usados ?? 0), limite: d.limite == null ? null : Number(d.limite) } : null
    },
    async configGoogle() {
      const r = await sb.rpc('hiadv_config_google')
      if (r.error) return { cfg: null, driveLigado: false }
      const d = r.data as Record<string, unknown> | null
      const cfg = { clientId: String(d?.client_id ?? ''), apiKey: String(d?.api_key ?? ''), appId: String(d?.app_id ?? '') }
      return { cfg: configCompleta(cfg) ? cfg : null, driveLigado: !!d?.drive_ligado }
    },
    async configGoogleSalvar(cfg) {
      okOuErro(verificar(await sb.rpc('hiadv_config_google_salvar', { p: { client_id: cfg.clientId.trim(), api_key: cfg.apiKey.trim(), app_id: cfg.appId.trim() } })))
    },
    async centralNovo(n) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_central_novo', { p: { nome: n.nome, cidade: n.cidade, oab: n.oab, master_nome: n.masterNome, master_email: n.masterEmail, plano: n.plano, fundador: n.fundador } })))
      return String(r.id)
    },
    async centralPainel(mes) {
      const d = verificar(await sb.rpc('hiadv_central_painel', mes ? { p_mes: mes } : {})) as Record<string, any>
      return { inicio: d.inicio, fim: d.fim, recebido: Number(d.recebido ?? 0), previsto: Number(d.previsto ?? 0), emAtraso: Number(d.em_atraso ?? 0),
        dias: (d.dias ?? []).map((x: any) => ({ dia: Number(x.dia), recebido: Number(x.recebido ?? 0), previsto: Number(x.previsto ?? 0) })) }
    },
    async centralPagamento(id, valor, pagoEm, forma) {
      const r = okOuErro(verificar(await sb.rpc('hiadv_central_pagamento', { p_id: id, p_valor: valor, p_pago_em: pagoEm, p_forma: forma })))
      return String(r.proximo_vencimento ?? '')
    },
    async centralPagamentos(id) {
      const d = (verificar(await sb.rpc('hiadv_central_pagamentos', { p_id: id })) ?? []) as Record<string, any>[]
      return d.map((x) => ({ competencia: x.competencia, valor: Number(x.valor), pagoEm: x.pago_em, forma: x.forma ?? '' }))
    },
    async centralMotivo(id, texto) { verificar(await sb.rpc('hiadv_central_motivo', { p_id: id, p_texto: texto })) },
    async falhas() {
      const r = await sb.rpc('falhas_listar')
      if (r.error && /function .*does not exist|Could not find the function/i.test(r.error.message)) return []
      return ((verificar(r) as Record<string, unknown>[] | null) ?? []).map((x): Falha => ({
        id: Number(x.id), casoId: String(x.caso_id), cliente: String(x.cliente ?? 'Cliente'), area: String(x.area ?? ''), etapa: (x.etapa as string) ?? null,
        origem: String(x.origem ?? ''), detalhe: String(x.detalhe ?? ''), em: String(x.em ?? ''),
      }))
    },
    async resolverFalha(id) { okOuErro(verificar(await sb.rpc('falha_resolver', { p_id: id }))) },
    async pacotes() {
      const r = await sb.rpc('pacotes_listar')
      if (r.error && /function .*does not exist|Could not find the function/i.test(r.error.message)) return []
      return ((verificar(r) as Record<string, unknown>[] | null) ?? []).map((x): PacoteBiblioteca => ({
        slug: String(x.slug), nome: String(x.nome), descricao: String(x.descricao ?? ''), areas: (x.areas as string[] | null) ?? [],
        itens: Number(x.itens ?? 0), adicionados: Number(x.adicionados ?? 0), titulos: ((x.titulos as string[] | null) ?? []).map(String),
      }))
    },
    async adicionarPacote(slug) {
      const r = okOuErro(verificar(await sb.rpc('pacote_adicionar', { p_slug: slug }))) as Record<string, unknown>
      return Number(r.adicionados ?? 0)
    },
    async etapasDoEscritorio(): Promise<EtapaEscritorio[]> {
      const areas = await this.areas()
      if (!areas.length) return []
      const r = verificar(await sb.from('fluxo_status').select('area, status, ordem, final').in('area', areas.map((a) => a.area)).order('ordem')) ?? []
      return r.filter((e) => !e.final).map((e) => ({ area: e.area as string, areaNome: areas.find((a) => a.area === e.area)?.nome ?? String(e.area), status: e.status as string }))
    },
    // ===== Conversas e Comunidades =====
    async chatLista() {
      const r = (verificar(await sb.rpc('chat_lista')) ?? []) as Record<string, unknown>[]
      return r.map(lerConversa)
    },
    async chatPessoas() {
      const r = (verificar(await sb.rpc('chat_pessoas')) ?? []) as Record<string, unknown>[]
      return r.map((p) => ({ email: String(p.email), nome: String(p.nome || p.email), papel: (p.papel as string) ?? null, vistoEm: (p.visto_em as string) ?? null }))
    },
    async chatMensagens(conversa, antes) {
      const r = (verificar(await sb.rpc('chat_mensagens_de', { p_conversa: conversa, p_antes: antes ?? null })) ?? []) as Record<string, unknown>[]
      return r.map(lerMensagem)
    },
    async chatEnviar(conversa, texto, anexo, respostaA) {
      const r = respostaA
        ? verificar(await sb.rpc('chat_responder', { p_conversa: conversa, p_texto: texto ?? '', p_resposta: respostaA }))
        : verificar(await sb.rpc('chat_enviar', { p_conversa: conversa, p_texto: texto, p_anexo: anexo ?? null }))
      return lerMensagem(r as Record<string, unknown>)
    },
    async chatDireta(email) { return String(verificar(await sb.rpc('chat_direta', { p_email: email }))) },
    async chatGrupo(titulo, emails, id) {
      const r = okOuErro(verificar(await sb.rpc('chat_grupo_salvar', { p_conversa: id ?? null, p_titulo: titulo, p_emails: emails })))
      return String(r.id)
    },
    async grupoInfo(conversa) { return verificar(await sb.rpc('chat_grupo_info', { p_conversa: conversa })) as GrupoInfo },
    async grupoEditar(conversa, titulo, descricao) { okOuErro(verificar(await sb.rpc('chat_grupo_editar', { p_conversa: conversa, p_titulo: titulo, p_descricao: descricao }))) },
    async grupoRegras(conversa, r) { okOuErro(verificar(await sb.rpc('chat_grupo_regras', { p_conversa: conversa, p_so_admins_enviam: r.soAdminsEnviam ?? null, p_so_admins_editam: r.soAdminsEditam ?? null }))) },
    async grupoAdicionar(conversa, emails) { okOuErro(verificar(await sb.rpc('chat_grupo_adicionar', { p_conversa: conversa, p_emails: emails }))) },
    async grupoRemover(conversa, email) { okOuErro(verificar(await sb.rpc('chat_grupo_remover', { p_conversa: conversa, p_email: email }))) },
    async grupoAdmin(conversa, email, admin) { okOuErro(verificar(await sb.rpc('chat_grupo_admin', { p_conversa: conversa, p_email: email, p_admin: admin }))) },
    async grupoSair(conversa) { okOuErro(verificar(await sb.rpc('chat_grupo_sair', { p_conversa: conversa }))) },
    async suporteGerar() { const r = okOuErro(verificar(await sb.rpc('suporte_gerar'))); return Number(r.novas ?? 0) },
    async suporteFila(status) { return (verificar(await sb.rpc('suporte_fila', { p_status: status })) ?? []) as GrupoAtualizacoes[] },
    async suporteSalvar(id, titulo, texto) { okOuErro(verificar(await sb.rpc('suporte_salvar', { p_id: id, p_titulo: titulo, p_texto: texto }))) },
    async suporteDescartar(ids) { const r = okOuErro(verificar(await sb.rpc('suporte_descartar', { p_ids: ids }))); return Number(r.descartadas ?? 0) },
    async suportePublicar(ids) { const r = okOuErro(verificar(await sb.rpc('suporte_publicar', { p_ids: ids }))); return { publicadas: Number(r.publicadas ?? 0), clientes: Number(r.clientes ?? 0) } },
    async suporteNova(clienteId, titulo, texto) { const r = okOuErro(verificar(await sb.rpc('suporte_nova', { p_cliente: clienteId, p_titulo: titulo, p_texto: texto }))); return String(r.id) },
    async suporteConversas() {
      const l = (verificar(await sb.rpc('suporte_conversas')) ?? []) as Record<string, unknown>[]
      return l.map((x) => ({ clienteId: String(x.cliente_id), nome: String(x.nome ?? ''), ultimaEm: String(x.ultima_em), ultima: String(x.ultima ?? ''), naoLidas: Number(x.nao_lidas ?? 0) }))
    },
    async suporteMensagens(clienteId) { return (verificar(await sb.rpc('suporte_mensagens', { p_cliente: clienteId })) ?? []) as MensagemCliente[] },
    async suporteResponder(clienteId, texto) { okOuErro(verificar(await sb.rpc('suporte_responder', { p_cliente: clienteId, p_texto: texto }))) },
    async chatLido(conversa) { verificar(await sb.rpc('chat_lido', { p_conversa: conversa })) },
    async chatReagir(msg, emoji) { verificar(await sb.rpc('chat_reagir', { p_id: msg, p_emoji: emoji })) },
    async chatApagar(msg) { verificar(await sb.rpc('chat_cancelar_envio', { p_id: msg })) },
    async chatSubir(onde, pasta, arquivo, nome, extra) {
      const path = caminhoAnexo(pasta, nome)
      const tipo = arquivo.type || 'application/octet-stream'
      const up = await sb.storage.from(onde).upload(path, arquivo, { contentType: tipo, upsert: false, cacheControl: '31536000' })
      if (up.error) throw new Error(/row-level|not allowed|Unauthorized/i.test(up.error.message) ? 'Sem permissão para enviar arquivos aqui.' : 'Não deu para enviar o arquivo. Confira a internet e tente de novo.')
      return { path, nome, tipo, tamanho: arquivo.size, ...extra }
    },
    async chatUrl(onde, path) {
      const r = await sb.storage.from(onde).createSignedUrl(path, 3600)
      if (r.error || !r.data) throw new Error('Arquivo indisponível.')
      return r.data.signedUrl
    },
    chatAssinar(conversa, aoChegar) {
      const canal = sb.channel(`chat:${conversa}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_mensagens', filter: `conversa_id=eq.${conversa}` }, () => aoChegar())
        .subscribe()
      return () => { void sb.removeChannel(canal) }
    },
    async comLista() {
      const r = await sb.rpc('comunidade_lista')
      if (r.error && /Could not find|does not exist/i.test(r.error.message)) return []
      return ((verificar(r) ?? []) as Record<string, unknown>[]).map(lerComunidade)
    },
    async comMensagens(id, antes) {
      const r = (verificar(await sb.rpc('comunidade_mensagens_de', { p_id: id, p_antes: antes ?? null })) ?? []) as Record<string, unknown>[]
      return r.map(lerMensagem)
    },
    async comEnviar(id, texto, anexo, respostaA) { okOuErro(verificar(await sb.rpc('comunidade_enviar', { p_id: id, p_texto: texto, p_anexo: anexo ?? null, p_resposta: respostaA ?? null }))) },
    async comLido(id) { verificar(await sb.rpc('comunidade_lido', { p_id: id })) },
    async comReagir(msg, emoji) { okOuErro(verificar(await sb.rpc('comunidade_reagir', { p_msg: msg, p_emoji: emoji }))) },
    async comApagar(msg) { okOuErro(verificar(await sb.rpc('comunidade_apagar', { p_msg: msg }))) },
    async comSalvar(f) {
      const r = okOuErro(verificar(await sb.rpc('comunidade_salvar', { p: { id: f.id ?? null, nome: f.nome, descricao: f.descricao, areas: f.areas, so_masters: f.soMasters, quem_posta: f.quemPosta, anexos: f.anexos, audios: f.audios, ativa: f.ativa, intervalo_seg: f.intervaloSeg, links: f.links, aprovacao: f.aprovacao } })))
      return String(r.id)
    },
    async comPessoas(id) {
      const r = (verificar(await sb.rpc('comunidade_pessoas', { p_id: id })) ?? []) as Record<string, unknown>[]
      return r.map((p) => ({ email: String(p.email), nome: String(p.nome), escritorio: (p.escritorio as string) ?? null, silenciadoAte: (p.silenciado_ate as string) ?? null }))
    },
    async chatTranscrever(msg, path) {
      try {
        const r = await sb.functions.invoke('transcrever', { body: { msg, path } })
        const d = r.data as { ok?: boolean; texto?: string; erro?: string; configurada?: boolean } | null
        if (d) return { ok: !!d.ok, texto: d.texto, erro: d.erro, configurada: d.configurada }
        return { ok: false, erro: 'Não deu para transcrever agora.' }
      } catch { return { ok: false, erro: 'Não deu para transcrever agora.' } }
    },
    async chatTranscreverPrevia(audio) {
      try {
        const f = new FormData()
        f.append('previa', '1')
        f.append('arquivo', new File([audio], `audio.${audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'}`, { type: audio.type }))
        const r = await sb.functions.invoke('transcrever', { body: f })
        const d = r.data as { ok?: boolean; texto?: string; erro?: string; configurada?: boolean } | null
        return d ? { ok: !!d.ok, texto: d.texto, erro: d.erro, configurada: d.configurada } : { ok: false, erro: 'Não deu para transcrever agora.' }
      } catch { return { ok: false, erro: 'Não deu para transcrever agora.' } }
    },
    async presencaPing() { await sb.rpc('presenca_ping') },
    async reuniaoRecusar(id) { await sb.rpc('reuniao_recusar', { p_reuniao: id }) },
    async chatTranscricaoSalvar(msg, texto) { await sb.rpc('chat_transcricao_salvar', { p_msg: msg, p_texto: texto }) },
    async chatBuscar(termo) {
      const r = await sb.rpc('chat_buscar', { p_termo: termo })
      if (r.error && /function|does not exist/i.test(r.error.message)) return []
      return ((verificar(r) ?? []) as Record<string, unknown>[]).map((x) => ({ id: String(x.id), reuniaoId: (x.reuniao_id as string) ?? null, conversaId: String(x.conversa_id), autor: String(x.autor), texto: (x.texto as string) ?? null,
        transcricao: (x.transcricao as string) ?? null, anexo: lerAnexo(x.anexo), criadoEm: String(x.criado_em), tipo: x.tipo as ResultadoBusca['tipo'], titulo: (x.titulo as string) ?? null }))
    },
    async reuniaoFalaEnviar(reuniao, audio) {
      const f = new FormData()
      f.append('reuniao', reuniao)
      f.append('arquivo', new File([audio], `trecho.${audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm'}`, { type: audio.type }))
      await sb.functions.invoke('transcrever', { body: f })
    },
    async reuniaoHistorico(conversa) {
      const r = await sb.rpc('reuniao_historico', { p_conversa: conversa })
      if (r.error) return []
      return ((r.data ?? []) as Record<string, unknown>[]).map((x) => ({ id: String(x.id), video: !!x.video, iniciadaPor: String(x.iniciada_por), inicio: String(x.inicio), fim: (x.fim as string) ?? null, participantes: (x.participantes as string[]) ?? [], recusados: (x.recusados as string[]) ?? [], falas: Number(x.falas ?? 0) }) satisfies ReuniaoPassada)
    },
    async reuniaoFalas(reuniao) {
      const r = await sb.rpc('reuniao_falas_de', { p_reuniao: reuniao })
      if (r.error) return []
      return ((r.data ?? []) as Record<string, unknown>[]).map((x) => ({ autor: String(x.autor), texto: String(x.texto), faladoEm: String(x.falado_em) }) satisfies Fala)
    },
    async reuniaoMinhasAtivas() {
      const r = await sb.rpc('reuniao_minhas_ativas')
      if (r.error) return []
      return ((r.data ?? []) as Record<string, unknown>[]).map((x) => ({ id: String(x.id), conversaId: String(x.conversa_id), video: !!x.video, iniciadaPor: String(x.iniciada_por), inicio: String(x.inicio), participantes: (x.participantes as string[]) ?? [] }) satisfies ChamadaAtiva)
    },
    async contatoLista() {
      const r = await sb.rpc('contato_lista')
      if (r.error && /function|does not exist/i.test(r.error.message)) return []
      return ((verificar(r) ?? []) as Record<string, unknown>[]).map((c) => ({ id: String(c.id), tipo: c.tipo === 'equipe' ? 'equipe' : 'externo', email: (c.email as string) ?? null,
        telefone: (c.telefone as string) ?? null, nome: String(c.nome), obs: (c.obs as string) ?? null, editadoPor: (c.editado_por as string) ?? null, editadoEm: String(c.editado_em) }) satisfies Contato)
    },
    async contatoSalvar(f) { return String(okOuErro(verificar(await sb.rpc('contato_salvar', { p: { id: f.id ?? null, tipo: f.tipo, email: f.email ?? null, telefone: f.telefone ?? null, nome: f.nome, obs: f.obs ?? null } }))).id) },
    async contatoApagar(id) { okOuErro(verificar(await sb.rpc('contato_apagar', { p_id: id }))) },
    async comPedirEntrada(id) { okOuErro(verificar(await sb.rpc('comunidade_pedir_entrada', { p_id: id }))) },
    async comPedidos(id) {
      const r = (verificar(await sb.rpc('comunidade_pedidos', { p_id: id })) ?? []) as Record<string, unknown>[]
      return r.map((x) => ({ escritorioId: String(x.escritorio_id), escritorio: String(x.escritorio ?? 'Escritório'), status: x.status as PedidoEntrada['status'], pedidoPor: (x.pedido_por as string) ?? null, pedidoEm: String(x.pedido_em) }))
    },
    async comDecidirEntrada(id, esc, aprovar) { okOuErro(verificar(await sb.rpc('comunidade_decidir_entrada', { p_id: id, p_escritorio: esc, p_aprovar: aprovar }))) },
    async comSilenciar(id, email, horas) { okOuErro(verificar(await sb.rpc('comunidade_silenciar', { p_id: id, p_email: email, p_horas: horas }))) },
    async reuniaoAtiva(conversa) {
      const r = verificar(await sb.rpc('reuniao_ativa', { p_conversa: conversa })) as Record<string, unknown> | null
      return r ? { id: String(r.id), video: !!r.video, iniciadaPor: String(r.iniciada_por), participantes: (r.participantes as string[]) ?? [] } : null
    },
    async reuniaoIniciar(conversa, video) { return String(okOuErro(verificar(await sb.rpc('reuniao_iniciar', { p_conversa: conversa, p_video: video }))).id) },
    async reuniaoEncerrar(id) { okOuErro(verificar(await sb.rpc('reuniao_encerrar', { p_reuniao: id }))) },
    async reuniaoIce() {
      try {
        const r = await sb.functions.invoke('chamada-ice', { body: {} })
        const lista = (r.data as { iceServers?: RTCIceServer[] } | null)?.iceServers
        return lista?.length ? lista : ICE
      } catch { return ICE }
    },
    reuniaoCanal(id) {
      let ch: ReturnType<typeof sb.channel> | null = null
      let aoSinal: (s: Sinal) => void = () => {}
      let aoPres: (v: Presenca[]) => void = () => {}
      let meuId = ''
      return {
        aoSinal(fn) { aoSinal = fn },
        aoPresenca(fn) { aoPres = fn },
        async entrar(eu) {
          meuId = eu.id
          try { await sb.realtime.setAuth() } catch { /* usa o token atual */ }
          ch = sb.channel(`reuniao:${id}`, { config: { private: true, broadcast: { self: false }, presence: { key: eu.id } } })
          ch.on('broadcast', { event: 'sinal' }, (m) => { const s = m.payload as Sinal; if (s.para === meuId) aoSinal(s) })
          ch.on('presence', { event: 'sync' }, () => {
            const st = ch!.presenceState() as Record<string, Presenca[]>
            aoPres(Object.values(st).flat().filter((p) => p.id && p.id !== meuId))
          })
          await new Promise<void>((ok, falha) => {
            ch!.subscribe(async (estado) => {
              if (estado === 'SUBSCRIBED') { await ch!.track(eu); ok() }
              else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') falha(new Error('A conexão da chamada falhou. Confira a internet e tente de novo.'))
            })
          })
        },
        enviar(s) { void ch?.send({ type: 'broadcast', event: 'sinal', payload: s }) },
        sair() { if (ch) { void ch.untrack(); void sb.removeChannel(ch); ch = null } },
      }
    },
  }
}
