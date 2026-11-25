import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { gargalos, largura, mesCurto, noPrazo } from '../data/relatorios'
import { duracaoTela } from '../data/horas'
import { taxaConversao } from '../data/atendimentos'
import { nomeDaArea } from '../data/areas'
import { moeda } from '../data/financeiro'
import { rotuloEtapa } from '../data/quadro'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'

const PERIODOS = [{ dias: 30, nome: '30 dias' }, { dias: 90, nome: '90 dias' }, { dias: 365, nome: '12 meses' }]

function Barra({ rotulo, valor, max, texto, tom }: { rotulo: string; valor: number; max: number; texto?: string; tom?: 'alerta' | 'suave' }) {
  return (
    <li className="rel-barra">
      <span className="rel-rotulo">{rotulo}</span>
      <span className="rel-trilho" aria-hidden="true"><span className="rel-cheio" data-tom={tom} style={{ width: `${largura(valor, max)}%` }} /></span>
      <span className="rel-valor">{texto ?? valor}</span>
    </li>
  )
}

/** Relatórios do escritório (só Gestor Master): casos, gargalos, equipe, clientes, prazos e dinheiro. */
export function Relatorios() {
  const api = useApi()
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || !!perfil?.code
  const [dias, setDias] = useState(90)
  const q = useQuery({ queryKey: ['relatorio', perfil?.escritorioId, dias], queryFn: () => api.relatorio(dias), enabled: !!perfil && gestor })
  if (perfil && !gestor) return <div className="pagina"><Panel><Empty title="Os relatórios ficam com o Gestor Master." /></Panel></div>
  const r = q.data
  const gs = r ? gargalos(r) : []
  const maxEtapa = Math.max(1, ...(r?.etapas ?? []).map((e) => e.media_dias))
  const maxPessoa = Math.max(1, ...(r?.pessoas ?? []).map((p) => p.abertas))
  const maxMes = Math.max(1, ...(r?.financeiro.meses ?? []).map((m) => Math.max(m.recebido, m.pago)))
  const maxOrigem = Math.max(1, ...(r?.clientes.origens ?? []).map((o) => o.n))

  return (
    <div className="pagina">
      <div className="pagina-cabeca"><div><h1>Relatórios</h1><p className="muted">Calculados na hora com os dados do escritório.</p></div></div>
      <div className="segmentos" role="group" aria-label="Período">
        {PERIODOS.map((p) => <button key={p.dias} type="button" aria-pressed={dias === p.dias} onClick={() => setDias(p.dias)}>{p.nome}</button>)}
      </div>
      {q.isLoading && <p className="muted" role="status">Carregando…</p>}
      {q.isError && <Panel><ErrorState onRetry={() => q.refetch()} /></Panel>}
      {r && (
        <>
          <dl className="fin-cartoes rel-cartoes">
            <div className="fin-cartao"><dt>Casos abertos</dt><dd>{r.casos.abertos}</dd></div>
            <div className="fin-cartao"><dt>Casos novos no período</dt><dd>{r.casos.novos}</dd></div>
            <div className="fin-cartao"><dt>Casos encerrados no período</dt><dd>{r.casos.encerrados}</dd></div>
            <div className="fin-cartao"><dt>Clientes novos</dt><dd>{r.clientes.novos}</dd></div>
            <div className="fin-cartao" data-tom={r.prazos.vencidos > 0 ? 'alerta' : undefined}><dt>Prazos vencidos sem baixa</dt><dd>{r.prazos.vencidos}</dd></div>
          </dl>

          <Panel title="Onde os casos param" labelId="rel-etapas">
            {r.etapas.length === 0 ? <Empty title="Nenhum caso aberto." /> : (
              <div className="hv-panel-body">
                {gs.length > 0 && <p className="rel-destaque">{gs.length === 1 ? 'Gargalo' : 'Gargalos'}: {gs.slice(0, 3).map((g) => `${rotuloEtapa(g.etapa)} (${nomeDaArea(g.area)}, ${g.media_dias.toLocaleString('pt-BR')} dias em média)`).join('; ')}.</p>}
                <ul className="rel-lista">
                  {r.etapas.map((e) => <Barra key={`${e.area}-${e.etapa}`} rotulo={`${rotuloEtapa(e.etapa)} · ${nomeDaArea(e.area)} (${e.casos})`} valor={e.media_dias} max={maxEtapa}
                    texto={`${e.media_dias.toLocaleString('pt-BR')} d · até ${e.maior_dias}`} tom={e.media_dias >= 7 ? 'alerta' : undefined} />)}
                </ul>
                <p className="hv-hint">Dias em média que os casos abertos estão na etapa atual, e o caso mais parado (“até”). A partir de 7 dias aparece em amarelo.</p>
              </div>
            )}
          </Panel>

          {r.ciclo.length > 0 && (
            <Panel title="Tempo até encerrar" labelId="rel-ciclo">
              <div className="hv-panel-body"><ul className="rel-lista">{r.ciclo.map((c) => <li key={c.area} className="rel-linha"><span>{nomeDaArea(c.area)}</span><strong>{c.media_dias} dias em média ({c.casos} {c.casos === 1 ? 'caso' : 'casos'})</strong></li>)}</ul></div>
            </Panel>
          )}

          <Panel title="Equipe" labelId="rel-equipe">
            <div className="hv-panel-body rel-tabela-rolagem" tabIndex={0} role="region" aria-label="Tabela da equipe">
              <table className="rel-tabela">
                <thead><tr><th scope="col">Pessoa</th><th scope="col">Tarefas abertas</th><th scope="col">Atrasadas</th><th scope="col">Feitas no período</th><th scope="col">No prazo</th><th scope="col">Horas</th><th scope="col">Casos</th></tr></thead>
                <tbody>{r.pessoas.map((p) => (
                  <tr key={p.email}><th scope="row">{p.nome}</th>
                    <td><span className="rel-mini" style={{ width: `${largura(p.abertas, maxPessoa)}%` }} aria-hidden="true" />{p.abertas}</td>
                    <td data-alerta={p.atrasadas > 0 ? 'true' : undefined}>{p.atrasadas}</td><td>{p.feitas}</td>
                    <td data-alerta={(noPrazo(p) ?? 100) < 80 ? 'true' : undefined}>{noPrazo(p) === null ? '–' : `${noPrazo(p)}%`}</td>
                    <td>{p.minutos ? duracaoTela(p.minutos) : '–'}</td><td>{p.casos}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </Panel>

          {r.atendimentos && (
            <Panel title="Atendimentos (novos contatos)" labelId="rel-atend">
              <div className="hv-panel-body">
                <p className="rel-linha"><span>Novos no período</span><strong>{r.atendimentos.novos}</strong></p>
                <p className="rel-linha"><span>Viraram clientes</span><strong>{r.atendimentos.contratou}{taxaConversao(r.atendimentos.contratou, r.atendimentos.perdido) !== null ? ` (${taxaConversao(r.atendimentos.contratou, r.atendimentos.perdido)}% dos encerrados)` : ''}</strong></p>
                <p className="rel-linha"><span>Não fecharam</span><strong>{r.atendimentos.perdido}</strong></p>
                <p className="rel-linha"><span>Em andamento agora</span><strong>{r.atendimentos.em_aberto}</strong></p>
                {r.atendimentos.motivos.length > 0 && <p className="hv-hint">Por que não fecharam: {r.atendimentos.motivos.map((m) => `${m.motivo} (${m.n})`).join('; ')}.</p>}
              </div>
            </Panel>
          )}

          <Panel title="Dinheiro (últimos 6 meses)" labelId="rel-fin">
            <div className="hv-panel-body">
              <ul className="rel-lista">
                {r.financeiro.meses.map((m) => <Barra key={m.mes} rotulo={mesCurto(m.mes)} valor={m.recebido} max={maxMes} texto={moeda(m.recebido)} />)}
              </ul>
              <p className="rel-linha"><span>A receber</span><strong>{moeda(r.financeiro.a_receber)}</strong></p>
              <p className="rel-linha" data-alerta={r.financeiro.em_atraso > 0 ? 'true' : undefined}><span>Em atraso ({r.financeiro.clientes_em_atraso} {r.financeiro.clientes_em_atraso === 1 ? 'cliente' : 'clientes'})</span><strong>{moeda(r.financeiro.em_atraso)}</strong></p>
            </div>
          </Panel>

          <Panel title="Clientes e prazos" labelId="rel-cli">
            <div className="hv-panel-body">
              {r.clientes.origens.length > 0 && <>
                <h3 className="rel-sub">De onde vieram os clientes novos</h3>
                <ul className="rel-lista">{r.clientes.origens.map((o) => <Barra key={o.origem} rotulo={o.origem} valor={o.n} max={maxOrigem} tom="suave" />)}</ul>
              </>}
              <p className="rel-linha"><span>Publicações recebidas</span><strong>{r.prazos.publicacoes}</strong></p>
              <p className="rel-linha"><span>Prazos cumpridos</span><strong>{r.prazos.cumpridos}</strong></p>
              <p className="rel-linha"><span>Prazos correndo</span><strong>{r.prazos.em_aberto}</strong></p>
              <p className="rel-linha"><span>Total de clientes</span><strong>{r.clientes.total}</strong></p>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
