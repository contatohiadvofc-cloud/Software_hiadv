import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js'
import type { Api, Achado, Area, Escritorio, Papel, Perfil } from './api'
import { CredencialInvalida, SessaoExpirada } from './api'
import { diaSP, horaSP, type ItemDia } from './seuDia'
import type { Quadro } from './quadro'

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
      const [et, cs] = await Promise.all([
        sb.from('fluxo_status').select('status, ordem, final, pede_motivo').eq('area', area).order('ordem'),
        sb.rpc('casos_quadro', { p_via: area }),
      ])
      const etapas = (verificar(et) ?? []).map((e) => ({ status: e.status as string, ordem: e.ordem as number, final: !!e.final, pedeMotivo: !!e.pede_motivo }))
      const casos = ((verificar(cs) as Array<Record<string, unknown>> | null) ?? []).map((c) => ({
        id: c.id as string, cliente: (c.cliente as string) ?? '', status: c.status as string, dias: Number(c.dias ?? 0),
        produto: (c.produto as string) ?? null, numeroCnj: (c.numero_cnj as string) ?? null,
        gateOk: Number(c.gate_ok ?? 0), gateTotal: Number(c.gate_total ?? 0),
      }))
      return { etapas, casos }
    },
    async moverCaso(id, status, motivo) {
      verificar(await sb.rpc('caso_status', { p_caso: id, p_status: status, p_motivo: motivo ?? null }))
    },
  }
}
