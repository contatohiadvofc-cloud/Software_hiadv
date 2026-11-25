import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useItensDoDia } from '../data/consultas'
import { useApi, useSessao } from '../lib/contexto'
import { rotuloAtencao, type ItemAtencao } from '../data/atencao'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'
import { FichaCaso } from './FichaCaso'
import { agruparSeuDia, quandoTexto, type ItemDia } from '../data/seuDia'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'

import { Filtros, Indicadores } from '../design/components/Padrao'

const ROTULO: Record<ItemDia['tipo'], string> = { prazo: 'Prazo', tarefa: 'Tarefa', pericia: 'Perícia', audiencia: 'Audiência' }
const COR: Record<ItemDia['tipo'], string> = { prazo: 'var(--t-prazo)', tarefa: 'var(--t-tarefa)', pericia: 'var(--t-pericia)', audiencia: 'var(--t-audiencia)' }

function saudacao(agora: Date) {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }).format(agora))
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function Linha({ it, urgente, agora }: { it: ItemDia; urgente: boolean; agora: Date }) {
  return (
    <li className="hv-row">
      <span className="tipo"><span className="hv-dot" style={{ background: COR[it.tipo] }} aria-hidden="true" />{ROTULO[it.tipo]}</span>
      <span className="texto"><span className="titulo">{it.titulo}</span>{it.sub && <span className="sub">{it.sub}</span>}</span>
      <span className="quando" data-urgente={urgente ? 'true' : undefined}>{quandoTexto(it, agora)}</span>
      <span className="quem">{it.quem}</span>
    </li>
  )
}

function Grupo({ titulo, itens, urgente = false, agora }: { titulo: string; itens: ItemDia[]; urgente?: boolean; agora: Date }) {
  if (!itens.length) return null
  return (
    <div>
      <h3 className="hv-group-title"><span>{titulo}</span><span>{itens.length}</span></h3>
      <ul className="seu-dia-lista">{itens.map((it) => <Linha key={it.id} it={it} urgente={urgente} agora={agora} />)}</ul>
    </div>
  )
}

function nomeCurto(email: string | null) {
  if (!email) return null
  const n = email.split('@')[0].split(/[._-]/)[0]
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : null
}

function Atencao() {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const [ficha, setFicha] = useState<{ id: string; nome: string } | null>(null)
  const q = useQuery({ queryKey: ['atencao', perfil?.escritorioId, perfil?.email], queryFn: () => api.atencao(), enabled: !!perfil })
  const preparo = useMutation({
    mutationFn: (it: ItemAtencao) => api.criarPreparo(it.evento ?? 'pericia', it.id),
    onSuccess: (r) => {
      toast(r.ja ? 'A preparação já tinha sido criada.' : 'Tarefa de preparação criada, com roteiro.')
      qc.invalidateQueries({ queryKey: ['atencao'] }); qc.invalidateQueries({ queryKey: ['tarefas'] }); qc.invalidateQueries({ queryKey: ['seu-dia'] })
    },
    onError: (e) => toast((e as Error).message),
  })
  const itens = q.data ?? []
  if (!q.isSuccess || itens.length === 0) return null
  return (
    <Panel title="Precisa de atenção" labelId="h-precisa">
      <ul className="seu-dia-lista atencao-lista">
        {itens.map((it) => {
          const quem = it.escalado ? nomeCurto(it.responsavel) : null
          return (
            <li key={`${it.tipo}-${it.id}`} className="hv-row atencao-item" data-gravidade={it.gravidade}>
              <span className="tipo"><span className="hv-dot" data-tipo={it.tipo} aria-hidden="true" />{rotuloAtencao(it)}</span>
              <span className="texto"><span className="titulo">{it.titulo}</span><span className="sub">{it.detalhe}{quem && ` · com ${quem}`}</span></span>
              <span className="atencao-acao">
                {it.tipo === 'preparo' && <Button size="sm" variant="secondary" disabled={preparo.isPending} onClick={() => preparo.mutate(it)}>Criar preparação</Button>}
                {it.tipo === 'parado' && it.casoId && <Button size="sm" variant="ghost" onClick={() => setFicha({ id: it.casoId!, nome: it.titulo })}>Abrir caso</Button>}
                {it.tipo === 'prazo' && <Link to="/tarefas" className="hv-link">Ver tarefa</Link>}
              </span>
            </li>
          )
        })}
      </ul>
      <FichaCaso casoId={ficha?.id ?? null} nome={ficha?.nome ?? ''} aoFechar={() => { setFicha(null); qc.invalidateQueries({ queryKey: ['atencao'] }) }} />
    </Panel>
  )
}

export function SeuDia() {
  const { perfil } = useSessao()
  const q = useItensDoDia()
  const agora = useMemo(() => new Date(), [q.dataUpdatedAt])
  const g = useMemo(() => agruparSeuDia(q.data ?? [], agora), [q.data, agora])
  const primeiroNome = (perfil?.nome ?? '').split(' ')[0]
  const data = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }).format(agora)
  const total = g.atrasados.length + g.hoje.length + g.proximos7.length + g.semPrazo.length
  const [faixa, setFaixa] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'todos' | ItemDia['tipo']>('todos')
  const filtra = (l: ItemDia[]) => (tipo === 'todos' ? l : l.filter((x) => x.tipo === tipo))
  const conta = (t: ItemDia['tipo']) => [...g.atrasados, ...g.hoje, ...g.proximos7, ...g.semPrazo].filter((x) => x.tipo === t).length
  const mostra = (f: string) => !faixa || faixa === f

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div>
          <p className="muted pagina-data">{data.charAt(0).toUpperCase() + data.slice(1)}</p>
          <h1>{saudacao(agora)}{primeiroNome ? `, ${primeiroNome}` : ''}</h1>
        </div>
      </div>

      <Indicadores rotulo="Resumo do seu dia" ativo={faixa} aoEscolher={setFaixa} itens={[
        { id: 'atrasados', rotulo: 'Atrasados', valor: q.isSuccess ? g.atrasados.length : '–', tom: g.atrasados.length ? 'risco' : undefined },
        { id: 'hoje', rotulo: 'Para hoje', valor: q.isSuccess ? g.hoje.length : '–', tom: g.hoje.length ? 'atencao' : undefined },
        { id: 'semana', rotulo: 'Próximos 7 dias', valor: q.isSuccess ? g.proximos7.length : '–' },
        { id: 'sem', rotulo: 'Sem data', valor: q.isSuccess ? g.semPrazo.length : '–' },
      ]} />

      <Atencao />

      <Panel title="Sua agenda" labelId="h-agenda">
        {q.isSuccess && total > 0 && (
          <div className="hv-barra">
            <Filtros rotulo="Tipo" valor={tipo} aoMudar={setTipo} opcoes={[
              { id: 'todos', rotulo: 'Tudo', qtd: total },
              ...(['prazo', 'tarefa', 'pericia', 'audiencia'] as const).map((t) => ({ id: t, rotulo: ROTULO[t] + 's', qtd: conta(t) })).filter((o) => o.qtd > 0),
            ]} />
          </div>
        )}
        {q.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {q.isSuccess && total === 0 && <Empty title="Nada pendente para hoje.">Quando chegarem prazos, perícias, audiências ou tarefas para você, eles aparecem aqui.</Empty>}
        {q.isSuccess && total > 0 && (
          <>
            {mostra('atrasados') && <Grupo titulo="Atrasados" itens={filtra(g.atrasados)} urgente agora={agora} />}
            {mostra('hoje') && <Grupo titulo="Hoje" itens={filtra(g.hoje)} agora={agora} />}
            {mostra('semana') && <Grupo titulo="Próximos 7 dias" itens={filtra(g.proximos7)} agora={agora} />}
            {mostra('sem') && <Grupo titulo="Sem data" itens={filtra(g.semPrazo)} agora={agora} />}
          </>
        )}
      </Panel>
    </div>
  )
}
