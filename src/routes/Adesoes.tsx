import { Carregando } from '../design/components/Carregando'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { NOMES_STATUS, PERGUNTAS, PLANOS, plano, type Adesao, type Cortesia, type PlanoId, type StatusAdesao } from '../data/adesao'
import { linkWhatsapp, telefoneTela } from '../data/clientes'
import { dataTela } from '../data/publicacoes'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Badge } from '../design/components/Badge'
import { useToast } from '../design/components/Toast'

type Filtro = 'abertas' | 'ativada' | 'supremo' | 'todas'
const FILTROS: [Filtro, string][] = [['abertas', 'Para tratar'], ['ativada', 'Ativadas'], ['supremo', 'Lista do Master'], ['todas', 'Todas']]

function respostasTela(a: Adesao): string {
  return PERGUNTAS.map((p) => {
    const v = a.respostas[p.id]
    const vals = (Array.isArray(v) ? v : v ? [v] : []).map((x) => p.opcoes.find((o) => o.valor === x)?.rotulo ?? x)
    return vals.length ? vals.join(', ') : null
  }).filter(Boolean).join(' · ')
}

function Pedido({ a }: { a: Adesao }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const [obs, setObs] = useState(a.obs ?? '')
  // marca na hora (sem esperar o servidor); volta ao valor do servidor quando ele responde
  const [fundador, setFundador] = useState(a.fundador)
  useEffect(() => { setFundador(a.fundador) }, [a.fundador])
  const ok = (m: string) => { toast(m); qc.invalidateQueries({ queryKey: ['adesoes'] }) }
  const erro = (e: unknown) => toast((e as Error).message, 'danger')
  const status = useMutation({ mutationFn: (v: { s: StatusAdesao; fundador?: boolean; cortesia?: Cortesia; obs?: string }) => api.adesaoAtualizar(a.id, v.s, { fundador: v.fundador, cortesia: v.cortesia, obs: v.obs }), onSuccess: () => ok('Pedido atualizado.'), onError: erro })
  const mudarPlano = useMutation({ mutationFn: (p: PlanoId) => api.adesaoPlano(a.id, p), onSuccess: () => ok('Plano trocado.'), onError: erro })
  const wa = linkWhatsapp(a.whatsapp)
  const msg = `Olá, ${a.nome.split(' ')[0]}! Aqui é da equipe do HiAdv. Recebemos o seu pedido do plano ${plano(a.plano).nome} e vamos liberar o seu acesso.`
  return (
    <li className="adm-pedido">
      <div className="adm-topo">
        <div className="fin-texto">
          <span className="fin-titulo">{a.nome}{a.escritorio ? ` · ${a.escritorio}` : ''}</span>
          <span className="fin-sub">{[a.oab, [a.cidade, a.uf].filter(Boolean).join('/'), a.email, telefoneTela(a.whatsapp)].filter(Boolean).join(' · ')}</span>
          <span className="fin-sub">Pedido em {dataTela(a.criadoEm.slice(0, 10))}{a.recomendado && a.recomendado !== a.plano ? ` · recomendado: ${plano(a.recomendado).nome}` : ''}{a.indicadorEmail ? ` · indicado por ${a.indicadorEmail}${a.indicadorEscritorio ? ` (${a.indicadorEscritorio})` : ''}` : ''}</span>
        </div>
        <Badge tone={a.status === 'ativada' ? 'success' : a.status === 'recusada' ? 'neutral' : 'info'}>{NOMES_STATUS[a.status]}</Badge>
      </div>
      {respostasTela(a) && <p className="adm-respostas">{respostasTela(a)}</p>}
      {a.respostas.implantacao === 'assistida' && <p className="adm-respostas"><Badge tone="info">Quer implantação assistida (7 dias)</Badge></p>}
      <div className="adm-acoes">
        <label className="adm-campo"><span>Plano</span>
          <select className="hv-input" value={a.plano} onChange={(e) => mudarPlano.mutate(e.target.value as PlanoId)}>{PLANOS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
        </label>
        <label className="adm-campo"><span>Situação</span>
          <select className="hv-input" value={a.status} onChange={(e) => status.mutate({ s: e.target.value as StatusAdesao })}>
            {(Object.keys(NOMES_STATUS) as StatusAdesao[]).map((s) => <option key={s} value={s}>{NOMES_STATUS[s]}</option>)}
          </select>
        </label>
        <label className="alternar"><input type="checkbox" checked={fundador} onChange={(e) => { setFundador(e.target.checked); status.mutate({ s: a.status, fundador: e.target.checked }) }} /> Fundador</label>
        {a.indicadorEmail && (
          <label className="adm-campo"><span>Cortesia de quem indicou</span>
            <select className="hv-input" value={a.cortesia} onChange={(e) => status.mutate({ s: a.status, cortesia: e.target.value as Cortesia })}>
              <option value="nenhuma">Nenhuma</option><option value="pendente">20% a aplicar</option><option value="aplicada">20% aplicado</option>
            </select>
          </label>
        )}
      </div>
      <div className="adm-acoes">
        <input className="hv-input adm-obs" aria-label={`Anotação sobre ${a.nome}`} maxLength={500} placeholder="Anotação interna" value={obs} onChange={(e) => setObs(e.target.value)}
          onBlur={() => { if (obs !== (a.obs ?? '')) status.mutate({ s: a.status, obs }) }} />
        {wa && <a className="hv-btn" data-variant="secondary" data-size="sm" href={`${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
      </div>
    </li>
  )
}

/** Pedidos de adesão (só a administração do HiAdv). Ativar aqui não cria o escritório sozinho: a liberação continua manual. */
export function Adesoes() {
  const api = useApi()
  const { perfil } = useSessao()
  const code = !!perfil?.code
  const q = useQuery({ queryKey: ['adesoes'], queryFn: () => api.adesoes(), enabled: !!perfil && code })
  const vagas = useQuery({ queryKey: ['adesao-vagas'], queryFn: () => api.adesaoVagas(), enabled: !!perfil && code })
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const lista = useMemo(() => (q.data ?? []).filter((a) => filtro === 'todas' ? true : filtro === 'supremo' ? a.plano === 'supremo' && a.status !== 'ativada'
    : filtro === 'ativada' ? a.status === 'ativada' : (a.status === 'nova' || a.status === 'em_contato') && a.plano !== 'supremo'), [q.data, filtro])
  const supremo = (q.data ?? []).filter((a) => a.plano === 'supremo' && a.status !== 'recusada').length
  if (perfil && !code) return <div className="pagina"><Panel><Empty title="Esta tela é da administração do HiAdv." /></Panel></div>
  return (
    <div className="pagina">
      <div className="pagina-cabeca"><div><h1>Adesões</h1>
        <p className="muted">{vagas.data !== undefined ? `${vagas.data} de 20 vagas de fundador restantes. ` : ''}{supremo ? `${supremo} ${supremo === 1 ? 'pessoa' : 'pessoas'} na lista do Master.` : ''}</p></div></div>
      <div className="segmentos" role="group" aria-label="Filtrar pedidos">
        {FILTROS.map(([f, nome]) => <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>{nome}</button>)}
      </div>
      {q.isLoading && <Carregando texto="Carregando…" />}
      {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
      {q.isSuccess && lista.length === 0 && <Panel><Empty title="Nenhum pedido aqui.">Os pedidos chegam pela página Aderir do site e pelos links de indicação.</Empty></Panel>}
      {lista.length > 0 && <Panel><ul className="adm-lista">{lista.map((a) => <Pedido key={a.id} a={a} />)}</ul></Panel>}
    </div>
  )
}
