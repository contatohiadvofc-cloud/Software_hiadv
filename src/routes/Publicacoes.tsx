import { Carregando } from '../design/components/Carregando'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { cnjTela, dataTela, porDia, prazoNoTexto, type Publicacao } from '../data/publicacoes'
import { diaSP } from '../data/seuDia'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Filtros, Indicadores } from '../design/components/Padrao'
import { Button } from '../design/components/Button'
import { PrazoDialog, type PrazoInicial } from './Prazo'
import { AssistenteIA } from './AssistenteIA'
import { useRecursos } from '../data/consultas'

const PERIODOS = [{ dias: 7, nome: '7 dias' }, { dias: 30, nome: '30 dias' }, { dias: 90, nome: '90 dias' }]

function rotuloDia(dia: string, hoje: string) {
  const ontem = new Date(Date.parse(hoje + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10)
  if (dia === hoje) return 'Hoje'
  if (dia === ontem) return 'Ontem'
  return dataTela(dia)
}

function Item({ p, aoPrazo, aoResumir }: { p: Publicacao; aoPrazo: (p: Publicacao) => void; aoResumir?: (p: Publicacao) => void }) {
  const [aberto, setAberto] = useState(false)
  const longo = (p.texto?.length ?? 0) > 220
  return (
    <li className="pub-item" data-tipo={p.publicacao ? 'publicacao' : 'andamento'}>
      <div className="pub-cabeca">
        <span className="pub-tipo">{p.publicacao ? 'Publicação' : 'Andamento'}</span>
        <strong className="pub-titulo">{p.titulo}</strong>
      </div>
      <p className="pub-meta">
        {p.clienteId ? <Link to="/clientes/$id" params={{ id: p.clienteId }}>{p.cliente}</Link> : <span>Processo sem cliente vinculado</span>}
        {p.numeroCnj && <span className="pub-cnj">{cnjTela(p.numeroCnj)}</span>}
      </p>
      {p.texto && (
        <p className="pub-texto">{longo && !aberto ? `${p.texto.slice(0, 220).trimEnd()}…` : p.texto}
          {longo && <button type="button" className="pub-mais" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>{aberto ? 'Mostrar menos' : 'Ler tudo'}</button>}
        </p>
      )}
      <div className="pub-acoes">
        {p.tarefa
          ? <Link to="/tarefas" className="pub-tarefa" data-feita={p.tarefa.feita ? 'true' : undefined}>
              {p.tarefa.feita ? 'Tarefa concluída' : p.tarefa.prazo ? `Virou tarefa · prazo ${dataTela(p.tarefa.prazo)}` : 'Virou tarefa'}
            </Link>
          : p.publicacao && <Button size="sm" variant="secondary" onClick={() => aoPrazo(p)}>Calcular prazo e criar tarefa</Button>}
        {aoResumir && p.texto && <Button size="sm" variant="ghost" onClick={() => aoResumir(p)}>Resumir com IA</Button>}
      </div>
    </li>
  )
}

/** Publicações do DJEN e andamentos dos tribunais dos processos do escritório (captura automática pelas OABs). */
export function Publicacoes() {
  const api = useApi()
  const { perfil } = useSessao()
  const [dias, setDias] = useState(30)
  const [so, setSo] = useState(true)
  const [prazo, setPrazo] = useState<PrazoInicial | null>(null)
  const [resumir, setResumir] = useState<Publicacao | null>(null)
  const recursos = useRecursos()
  const q = useQuery({ queryKey: ['publicacoes', perfil?.escritorioId, dias, so], queryFn: () => api.publicacoes(dias, so), enabled: !!perfil })
  const oabs = useQuery({ queryKey: ['oabs', perfil?.escritorioId], queryFn: () => api.oabs(), enabled: !!perfil, staleTime: 10 * 60_000 })
  const hoje = diaSP(new Date())
  const grupos = porDia(q.data ?? [])
  const semTarefa = (q.data ?? []).filter((p) => p.publicacao && !p.tarefa).length
  const gestor = perfil?.papel === 'master' || !!perfil?.code

  function abrirPrazo(p: Publicacao) {
    setPrazo({ inicio: diaSP(new Date(p.quando)), dias: prazoNoTexto(p.texto), disponibilizacao: true, titulo: `${p.titulo}${p.cliente ? ` · ${p.cliente}` : ''}`.slice(0, 160), detalhe: (p.texto ?? '').slice(0, 900), processoId: p.processoId })
  }

  return (
    <div className="pagina">
      {resumir && <AssistenteIA open onOpenChange={(v) => { if (!v) setResumir(null) }} ctx={{ acao: 'resumo_intimacao', texto: [resumir.titulo, resumir.numeroCnj ? `Processo ${cnjTela(resumir.numeroCnj)}` : '', resumir.texto ?? ''].filter(Boolean).join('\n'), cliente: resumir.clienteId ? { id: resumir.clienteId, nome: resumir.cliente ?? '' } : undefined }} />}
      <div className="pagina-cabeca">
        <div>
          <h1>Publicações</h1>
          {q.isSuccess && <p className="muted">{q.data.length} {q.data.length === 1 ? 'item' : 'itens'}{so && semTarefa > 0 ? ` · ${semTarefa} sem tarefa` : ''}</p>}
        </div>
        <div className="pagina-acoes">
          <Button variant="secondary" onClick={() => setPrazo({})}>Calcular prazo</Button>
        </div>
      </div>

      {q.isSuccess && q.data.length > 0 && (
        <Indicadores rotulo="Resumo das publicações" itens={[
          { id: 'itens', rotulo: so ? 'Publicações' : 'Itens', valor: q.data.length, dica: `últimos ${dias} dias` },
          { id: 'hoje', rotulo: 'Chegaram hoje', valor: (q.data ?? []).filter((p) => diaSP(new Date(p.quando)) === hoje).length },
          { id: 'semtarefa', rotulo: 'Sem tarefa', valor: semTarefa, tom: semTarefa ? 'atencao' : 'ok', dica: semTarefa ? 'crie o prazo de cada uma' : 'tudo com tarefa' },
        ]} />
      )}

      <div className="pub-filtros hv-barra-solta" role="group" aria-label="Filtros">
        <Filtros rotulo="Mostrar" valor={so ? 'pub' : 'tudo'} aoMudar={(v) => setSo(v === 'pub')} opcoes={[{ id: 'pub', rotulo: 'Publicações' }, { id: 'tudo', rotulo: 'Tudo (com andamentos)' }]} />
        <Filtros rotulo="Período" valor={String(dias)} aoMudar={(v) => setDias(Number(v))} opcoes={PERIODOS.map((x) => ({ id: String(x.dias), rotulo: x.nome }))} />
      </div>

      {oabs.isSuccess && oabs.data.oabs.length === 0 && (
        <Panel>
          <Empty title="Nenhuma OAB acompanhada ainda.">
            {gestor ? <>Cadastre as OABs do escritório em <Link to="/configuracoes" hash="oabs">Configurações › OABs acompanhadas</Link>. O HiAdv busca as publicações uma vez por dia.</> : 'Peça ao Gestor para cadastrar as OABs do escritório em Configurações.'}
          </Empty>
        </Panel>
      )}

      <Panel>
        {q.isLoading && <Carregando painel texto="Carregando…" />}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {q.isSuccess && q.data.length === 0 && <Empty title={`Nada nos últimos ${dias} dias.`}>As publicações chegam sozinhas, uma vez por dia, pelas OABs do escritório.</Empty>}
        {grupos.map((g) => (
          <div key={g.dia}>
            <h3 className="hv-group-title"><span>{rotuloDia(g.dia, hoje)}</span><span>{g.itens.length}</span></h3>
            <ul className="pub-lista">{g.itens.map((p) => <Item key={p.id} p={p} aoPrazo={abrirPrazo} aoResumir={recursos.pode('ia') ? setResumir : undefined} />)}</ul>
          </div>
        ))}
      </Panel>
      {oabs.isSuccess && oabs.data.oabs.length > 0 && <p className="hv-hint pub-rodape">Acompanhando: {oabs.data.oabs.join(', ')}. Fonte: DJEN (CNJ) e as ferramentas conectadas em Integrações.</p>}

      <PrazoDialog aberto={!!prazo} aoFechar={() => setPrazo(null)} inicial={prazo ?? undefined} />
    </div>
  )
}
