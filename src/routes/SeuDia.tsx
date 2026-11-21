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

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div>
          <p className="muted pagina-data">{data.charAt(0).toUpperCase() + data.slice(1)}</p>
          <h1>{saudacao(agora)}{primeiroNome ? `, ${primeiroNome}` : ''}</h1>
        </div>
      </div>

      <div className="resumo" aria-label="Resumo">
        {[['Atrasados', g.atrasados.length], ['Para hoje', g.hoje.length], ['Próximos 7 dias', g.proximos7.length], ['Sem data', g.semPrazo.length]].map(([r, n]) => (
          <div key={r} className="resumo-item" data-alerta={r === 'Atrasados' && Number(n) > 0 ? 'true' : undefined} data-destaque={r === 'Para hoje' ? 'true' : undefined}>
            <span className="resumo-rotulo">{r}</span><span className="resumo-n">{q.isSuccess ? n : '–'}</span>
          </div>
        ))}
      </div>

      <Atencao />

      <Panel title="Sua agenda" labelId="h-agenda">
        {q.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {q.isSuccess && total === 0 && <Empty title="Nada pendente para hoje.">Quando chegarem prazos, perícias, audiências ou tarefas para você, eles aparecem aqui.</Empty>}
        {q.isSuccess && total > 0 && (
          <>
            <Grupo titulo="Atrasados" itens={g.atrasados} urgente agora={agora} />
            <Grupo titulo="Hoje" itens={g.hoje} agora={agora} />
            <Grupo titulo="Próximos 7 dias" itens={g.proximos7} agora={agora} />
            <Grupo titulo="Sem data" itens={g.semPrazo} agora={agora} />
          </>
        )}
      </Panel>
    </div>
  )
}
