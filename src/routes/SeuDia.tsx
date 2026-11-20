import { useMemo } from 'react'
import { useItensDoDia } from '../data/consultas'
import { useSessao } from '../lib/contexto'
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
          <div key={r} className="resumo-item" data-alerta={r === 'Atrasados' && Number(n) > 0 ? 'true' : undefined}>
            <span className="resumo-rotulo">{r}</span><span className="resumo-n">{q.isSuccess ? n : '–'}</span>
          </div>
        ))}
      </div>

      <Panel title="O que pede atenção" labelId="h-atencao">
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
