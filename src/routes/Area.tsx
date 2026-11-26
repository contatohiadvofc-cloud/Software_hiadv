import { Carregando } from '../design/components/Carregando'
import { useMemo, useState, type DragEvent } from 'react'
import { useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAreas } from '../data/consultas'
import { useApi, useSessao } from '../lib/contexto'
import { exigenciaDaMudanca, montarColunas, rotuloEtapa, type CasoCard, type Etapa, type Quadro } from '../data/quadro'
import { Indicadores } from '../design/components/Padrao'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { useToast } from '../design/components/Toast'
import { FichaCaso } from './FichaCaso'
import { NovoCasoDialog } from './Cadastro'

type Pedido = { caso: CasoCard; destino: Etapa }
const PARADO_DIAS = 15

function Cartao({ c, etapas, aoMover, aoAbrir }: { c: CasoCard; etapas: Etapa[]; aoMover: (c: CasoCard, status: string) => void; aoAbrir: (c: CasoCard) => void }) {
  return (
    <li className="cartao" draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', c.id); e.dataTransfer.effectAllowed = 'move' }}>
      <button type="button" className="cartao-nome" onClick={() => aoAbrir(c)}>{c.cliente}</button>
      {c.produto && <span className="cartao-sub">{c.produto}</span>}
      {!!c.destaques?.length && (
        <dl className="cartao-destaques">
          {c.destaques.map((d) => <div key={d.rotulo}><dt>{d.rotulo}</dt><dd>{d.valor}</dd></div>)}
        </dl>
      )}
      <span className="cartao-meta">
        <span data-parado={c.dias >= PARADO_DIAS ? 'true' : undefined}>{c.dias === 0 ? 'Entrou hoje' : `${c.dias} ${c.dias === 1 ? 'dia' : 'dias'} na etapa`}</span>
        {c.gateTotal > 0 && <span>Checklist {c.gateOk}/{c.gateTotal}</span>}
      </span>
      <label className="cartao-mover">
        <span className="sr-only">Mover {c.cliente} para</span>
        <select value="" onChange={(e) => e.target.value && aoMover(c, e.target.value)}>
          <option value="">Mover para…</option>
          {etapas.filter((e) => e.status !== c.status).map((e) => <option key={e.status} value={e.status}>{rotuloEtapa(e.status)}</option>)}
        </select>
      </label>
    </li>
  )
}

export function Area() {
  const { slug } = useParams({ strict: false }) as { slug: string }
  const api = useApi()
  const { perfil } = useSessao()
  const qc = useQueryClient()
  const toast = useToast()
  const areas = useAreas()
  const area = areas.data?.find((a) => a.area === slug)
  const [finais, setFinais] = useState(false)
  const [visao, setVisao] = useState<'quadro' | 'lista'>('quadro')
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [motivo, setMotivo] = useState('')
  const [alvo, setAlvo] = useState<string | null>(null)
  const [aberto, setAberto] = useState<CasoCard | null>(null)
  const [novoCaso, setNovoCaso] = useState(false)
  const [etapaCel, setEtapaCel] = useState<string | null>(null)
  const chave = ['quadro', perfil?.escritorioId, slug]

  const q = useQuery({ queryKey: chave, queryFn: () => api.quadro(slug), enabled: !!area })
  const colunas = useMemo(() => (q.data ? montarColunas(q.data.etapas, q.data.casos, finais) : []), [q.data, finais])
  // No celular, uma etapa por vez: começa pela primeira que tem casos.
  const ativa = colunas.some((c) => c.etapa.status === etapaCel) ? etapaCel : (colunas.find((c) => c.casos.length > 0) ?? colunas[0])?.etapa.status ?? null

  const mover = useMutation({
    mutationFn: (v: { id: string; status: string; motivo?: string }) => api.moverCaso(v.id, v.status, v.motivo),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chave })
      const antes = qc.getQueryData<Quadro>(chave)
      if (antes) qc.setQueryData<Quadro>(chave, { ...antes, casos: antes.casos.map((c) => (c.id === v.id ? { ...c, status: v.status, dias: 0 } : c)) })
      return { antes }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(chave, ctx.antes)
      toast(`Não foi possível mover: ${(e as Error).message}`, 'danger')
    },
    onSuccess: (_d, v) => toast(`Caso movido para “${rotuloEtapa(v.status)}”.`),
    onSettled: () => qc.invalidateQueries({ queryKey: chave }),
  })

  function pedirMudanca(c: CasoCard, status: string) {
    const destino = q.data?.etapas.find((e) => e.status === status)
    if (!destino || c.status === status) return
    const ex = exigenciaDaMudanca(destino)
    if (ex.motivo || ex.confirmar) { setMotivo(''); setPedido({ caso: c, destino }) }
    else mover.mutate({ id: c.id, status })
  }

  function soltar(e: DragEvent, status: string) {
    e.preventDefault(); setAlvo(null)
    const id = e.dataTransfer.getData('text/plain')
    const c = q.data?.casos.find((x) => x.id === id)
    if (c) pedirMudanca(c, status)
  }

  if (areas.isSuccess && !area) return <div className="pagina"><Panel><Empty title="Esta área não está ativa no seu escritório." /></Panel></div>
  const ex = pedido ? exigenciaDaMudanca(pedido.destino) : null
  const total = q.data?.casos.length ?? 0

  return (
    <div className="pagina pagina-larga">
      <div className="pagina-cabeca">
        <div>
          <h1>{area?.nome ?? '…'}</h1>
          {q.isSuccess && <p className="muted">{total} {total === 1 ? 'caso' : 'casos'}</p>}
        </div>
        <div className="pagina-acoes">
          <label className="alternar"><input type="checkbox" checked={finais} onChange={(e) => setFinais(e.target.checked)} /> Mostrar encerrados</label>
          <div role="group" aria-label="Visão" className="segmentos">
            <button type="button" aria-pressed={visao === 'quadro'} onClick={() => setVisao('quadro')}>Quadro</button>
            <button type="button" aria-pressed={visao === 'lista'} onClick={() => setVisao('lista')}>Lista</button>
          </div>
          <Button onClick={() => setNovoCaso(true)}>Novo caso</Button>
        </div>
      </div>

      {q.isSuccess && total > 0 && (() => {
        const ab = q.data.casos.filter((c) => !q.data.etapas.find((e) => e.status === c.status)?.final)
        const parados = ab.filter((c) => c.dias >= PARADO_DIAS).length
        const prontos = ab.filter((c) => c.gateTotal > 0 && c.gateOk === c.gateTotal).length
        const hoje = ab.filter((c) => c.dias === 0).length
        return <Indicadores rotulo="Resumo da área" itens={[
          { id: 'abertos', rotulo: 'Casos em andamento', valor: ab.length },
          { id: 'hoje', rotulo: 'Entraram na etapa hoje', valor: hoje },
          { id: 'parados', rotulo: `Parados há ${PARADO_DIAS}+ dias`, valor: parados, tom: parados ? 'atencao' : 'ok' },
          { id: 'prontos', rotulo: 'Checklist completo', valor: prontos, dica: 'prontos para avançar' },
        ]} />
      })()}
      {q.isLoading && <Carregando texto="Carregando os casos…" />}
      {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
      {q.isSuccess && q.data.etapas.length === 0 && <Panel><Empty title="Esta área ainda não tem etapas configuradas.">O Gestor Master define as etapas em Configurações, no grupo Rotina da equipe.</Empty></Panel>}

      {q.isSuccess && q.data.etapas.length > 0 && visao === 'quadro' && (
        <>
        <div className="etapas-abas" role="tablist" aria-label="Etapas">
          {colunas.map((col) => (
            <button key={col.etapa.status} type="button" role="tab" className="etapa-aba" aria-selected={ativa === col.etapa.status}
              data-vazia={col.casos.length === 0 ? 'true' : undefined} onClick={() => setEtapaCel(col.etapa.status)}>
              {rotuloEtapa(col.etapa.status)} <span className="etapa-aba-n">{col.casos.length}</span>
            </button>
          ))}
        </div>
        <div className="quadro" role="region" aria-label="Quadro de casos" tabIndex={0}>
          {colunas.map((col) => (
            <section key={col.etapa.status} className="coluna" data-ativa={ativa === col.etapa.status ? 'true' : undefined} data-alvo={alvo === col.etapa.status ? 'true' : undefined} data-final={col.etapa.final ? 'true' : undefined}
              aria-label={`${rotuloEtapa(col.etapa.status)}: ${col.casos.length}`}
              onDragOver={(e) => { e.preventDefault(); setAlvo(col.etapa.status) }} onDragLeave={() => setAlvo(null)} onDrop={(e) => soltar(e, col.etapa.status)}>
              <h2 className="coluna-titulo"><span>{rotuloEtapa(col.etapa.status)}</span><span className="coluna-n">{col.casos.length}</span></h2>
              <ul className="coluna-lista">
                {col.casos.map((c) => <Cartao key={c.id} c={c} etapas={q.data.etapas} aoMover={pedirMudanca} aoAbrir={setAberto} />)}
              </ul>
              {col.casos.length === 0 && <p className="coluna-vazia">Nenhum caso nesta etapa.</p>}
            </section>
          ))}
        </div>
        </>
      )}

      {q.isSuccess && q.data.etapas.length > 0 && visao === 'lista' && (
        <Panel>
          {total === 0 ? <Empty title="Nenhum caso nesta área ainda.">Quando um caso chegar a uma etapa desta área, ele aparece aqui, com o responsável e o prazo.</Empty> : (
            <div className="tabela-caixa">
              <table className="tabela">
                <thead><tr><th scope="col">Cliente</th><th scope="col">Etapa</th><th scope="col">Na etapa</th><th scope="col">Checklist</th></tr></thead>
                <tbody>
                  {colunas.flatMap((col) => col.casos).map((c) => (
                    <tr key={c.id}><td><button type="button" className="link-botao" onClick={() => setAberto(c)}><b>{c.cliente}</b></button>{c.produto && <div className="muted">{c.produto}</div>}</td><td>{rotuloEtapa(c.status)}</td>
                      <td data-parado={c.dias >= PARADO_DIAS ? 'true' : undefined}>{c.dias} d</td><td>{c.gateTotal ? `${c.gateOk}/${c.gateTotal}` : '–'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <FichaCaso casoId={aberto?.id ?? null} nome={aberto?.cliente ?? ''} aoFechar={() => setAberto(null)} />
      <NovoCasoDialog aberto={novoCaso} area={slug} aoFechar={() => setNovoCaso(false)}
        aoCriar={(id, areaDoCaso, cliente) => {
          setNovoCaso(false)
          if (areaDoCaso === slug) setAberto({ id, cliente, status: '', dias: 0, produto: null, numeroCnj: null, gateOk: 0, gateTotal: 0 } as CasoCard)
        }} />

      <Dialog open={!!pedido} onOpenChange={(v) => !v && setPedido(null)} title="Confirmar mudança de etapa">
        {pedido && ex && (
          <form className="hv-dialog-body catalogo-pilha" onSubmit={(e) => {
            e.preventDefault()
            if (ex.motivo && motivo.trim().length < 3) return
            mover.mutate({ id: pedido.caso.id, status: pedido.destino.status, motivo: ex.motivo ? motivo.trim() : undefined })
            setPedido(null)
          }}>
            <p>O caso de <b>{pedido.caso.cliente}</b> vai para <b>“{rotuloEtapa(pedido.destino.status)}”</b>.
              {ex.confirmar && ' Esta é uma etapa de encerramento.'}</p>
            {ex.motivo && (
              <div className="hv-field">
                <label htmlFor="motivo">Motivo (obrigatório)</label>
                <textarea id="motivo" className="hv-input textarea" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} required minLength={3} />
              </div>
            )}
            <div className="catalogo-linha">
              <Button type="submit" disabled={ex.motivo && motivo.trim().length < 3}>Confirmar</Button>
              <Button variant="ghost" onClick={() => setPedido(null)}>Cancelar</Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}
