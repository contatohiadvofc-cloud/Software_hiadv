import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js'
import type { Api, Achado, Area, Escritorio, Papel, Perfil } from './api'
import { CredencialInvalida, SessaoExpirada } from './api'
import { diaSP, horaSP, type ItemDia } from './seuDia'
import { destaquesDoCartao, type Quadro } from './quadro'
import { AREAS_PREVIDENCIARIAS, BENEFICIO_DEFS, type Ficha } from './ficha'
import type { CampoDef, TipoCampo } from './campos'
import type { Pessoa, Tarefa } from './tarefas'
import { nomeTipo, type Compromisso } from './agenda'
import { nomeArquivoSeguro, type Agente, type EtapaEscritorio, type Integracao, type ItemBiblioteca, type Servico, type TipoBiblioteca } from './escritorio'
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

export function criarApiSupabase(url: string, chave: string): Api {
  const sb: SupabaseClient = createClient(url, chave, { auth: { persistSession: true, autoRefreshToken: true } })

  return {
    async temSessao() {
      const { data } = await sb.auth.getSession()
      return !!data.session
    },
    async entrar(email, senha) {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })
      if (error) {
        if (error.status === 400 || /invalid/i.test(error.message)) throw new CredencialInvalida()
        throw new Error('Não foi possível entrar agora. Tente de novo em instantes.')
      }
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
      verificar(await sb.rpc('tarefa_criar', { p_titulo: n.titulo.trim(), p_responsavel: n.responsavel || null, p_prazo: n.prazo || null, p_detalhe: n.detalhe.trim() || null }))
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
    async etapasDoEscritorio(): Promise<EtapaEscritorio[]> {
      const areas = await this.areas()
      if (!areas.length) return []
      const r = verificar(await sb.from('fluxo_status').select('area, status, ordem, final').in('area', areas.map((a) => a.area)).order('ordem')) ?? []
      return r.filter((e) => !e.final).map((e) => ({ area: e.area as string, areaNome: areas.find((a) => a.area === e.area)?.nome ?? String(e.area), status: e.status as string }))
    },
  }
}
