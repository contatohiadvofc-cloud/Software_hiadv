import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { agruparAgenda, type Compromisso } from '../data/agenda'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'

const COR = { pericia: 'var(--t-pericia)', audiencia: 'var(--t-audiencia)' }

function Item({ c }: { c: Compromisso }) {
  const corpo = (
    <>
      <span className="agenda-hora">{c.hora}</span>
      <span className="texto">
        <span className="titulo"><span className="hv-dot" style={{ background: COR[c.tipo] }} aria-hidden="true" /> {c.titulo} · {c.cliente}</span>
        {c.local && <span className="sub">{c.local}</span>}
      </span>
      <span className="quem">{c.quem}</span>
    </>
  )
  return <li>{c.clienteId ? <Link to="/clientes/$id" params={{ id: c.clienteId }} className="hv-row agenda-item">{corpo}</Link> : <span className="hv-row agenda-item">{corpo}</span>}</li>
}

export function Agenda() {
  const api = useApi()
  const { perfil } = useSessao()
  const [tipo, setTipo] = useState<'todos' | Compromisso['tipo']>('todos')
  const q = useQuery({ queryKey: ['agenda', perfil?.escritorioId], queryFn: () => api.agenda(), enabled: !!perfil, refetchInterval: 5 * 60_000 })
  const agora = useMemo(() => new Date(), [q.dataUpdatedAt])
  const dias = useMemo(() => agruparAgenda((q.data ?? []).filter((c) => tipo === 'todos' || c.tipo === tipo), agora), [q.data, tipo, agora])
  const total = dias.reduce((n, d) => n + d.itens.length, 0)

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Agenda</h1><p className="muted">Próximos 30 dias</p></div>
        <div className="pagina-acoes">
          <div role="group" aria-label="Mostrar" className="segmentos">
            {([['todos', 'Tudo'], ['pericia', 'Perícias'], ['audiencia', 'Audiências']] as const).map(([v, r]) => (
              <button key={v} type="button" aria-pressed={tipo === v} onClick={() => setTipo(v)}>{r}</button>
            ))}
          </div>
        </div>
      </div>
      <Panel>
        {q.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {q.isSuccess && total === 0 && <Empty title="Nada marcado nos próximos 30 dias." />}
        {q.isSuccess && dias.map((d) => (
          <div key={d.dia}>
            <h3 className="hv-group-title" data-hoje={d.rotulo === 'Hoje' ? 'true' : undefined}><span>{d.rotulo}</span><span>{d.itens.length}</span></h3>
            <ul className="seu-dia-lista">{d.itens.map((c) => <Item key={c.id} c={c} />)}</ul>
          </div>
        ))}
      </Panel>
    </div>
  )
}
