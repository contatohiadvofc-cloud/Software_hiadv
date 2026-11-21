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
import { nomeTipo, type Compromisso } from './agenda'
import { nomeArquivoSeguro, type PacoteBiblioteca, type Agente, type EtapaEscritorio, type Integracao, type ItemBiblioteca, type Servico, type TipoBiblioteca } from './escritorio'
import { lerValor } from './financeiro'
import type { DadosDocumento } from './modelos'
import type { Relatorio } from './relatorios'
import type { Lead } from './atendimentos'
import type { RegistroHoras } from './horas'
import type { Portal } from './portal'
import type { Adesao, Indicacao } from './adesao'
import { termoBusca, type ClienteFicha, type ClienteResumo } from './clientes'

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
      return { email, nome: (eq?.nome as string) || email, papel, escritorioId: escId, escritorioNome }
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
  }
}
