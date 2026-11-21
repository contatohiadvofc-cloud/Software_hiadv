import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js'
import type { Api, Achado, Area, Escritorio, Papel, Perfil } from './api'
import { CredencialInvalida, SessaoExpirada } from './api'
import { diaSP, horaSP, type ItemDia } from './seuDia'
import { destaquesDoCartao, type Quadro } from './quadro'
import type { Ficha } from './ficha'
import type { CampoDef, TipoCampo } from './campos'
import type { Pessoa, Tarefa } from './tarefas'
import { termoBusca, type ClienteFicha, type ClienteResumo } from './clientes'

function verificar<T>(r: { data: T; error: PostgrestError | null; status?: number }): T {
  if (r.error) {
    if (r.status === 401 || r.error.code === 'PGRST301' || /JWT/i.test(r.error.message)) throw new SessaoExpirada()
    throw new Error(r.error.message)
  }
  return r.data
}

const PAPEIS: Papel[] = ['code', 'master', 'colaborador', 'parceiro']

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
        checklist: ((d?.checklist as any[]) ?? []).map((g) => ({ item: String(g.item), rotulo: String(g.rotulo ?? g.item), feito: !!g.data })),
        historico: ((d?.historico as any[]) ?? []).map((h) => ({ evento: String(h.evento ?? ''), de: h.de ?? null, para: h.para ?? null, detalhe: h.detalhe ?? null, quem: h.quem ?? null, em: String(h.em ?? '') })),
        etapas: ((d?.status as any[]) ?? []).map((e, i) => ({ status: String(e.status), ordem: i + 1, final: !!e.final, pedeMotivo: !!e.pede_motivo })),
      }
    },
    async salvarCampos(id, campos) {
      const r = verificar(await sb.rpc('caso_campos_salvar', { p_caso: id, p_campos: campos })) as { ok: boolean; erro?: string; alterados?: number }
      if (!r?.ok) throw new Error(r?.erro ?? 'Não foi possível salvar.')
      return Number(r.alterados ?? 0)
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
  }
}
