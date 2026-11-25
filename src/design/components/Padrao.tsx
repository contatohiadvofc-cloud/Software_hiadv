// Padrão visual do HiAdv (definido na Central do Coder em 25/11/2026) para todas as telas internas:
// 1) números no topo (Indicadores), que também filtram quando são tocados;
// 2) filtros em pílulas (Filtros), um toque, sem menu escondido;
// 3) a mesma lista vista em cartões ou tabela (AlternarVisao);
// 4) partes de uma ficha em abas (Abas).
import type { ReactNode } from 'react'

export type Indicador = { id: string; rotulo: string; valor: ReactNode; tom?: 'atencao' | 'risco' | 'ok'; dica?: string }

export function Indicadores({ itens, ativo, aoEscolher, rotulo = 'Resumo' }: { itens: Indicador[]; ativo?: string | null; aoEscolher?: (id: string | null) => void; rotulo?: string }) {
  return (
    <div className="hv-kpis" role={aoEscolher ? 'group' : undefined} aria-label={rotulo}>
      {itens.map((k) => {
        const corpo = (<><span className="hv-kpi-rot">{k.rotulo}</span><strong>{k.valor}</strong>{k.dica && <small>{k.dica}</small>}</>)
        return aoEscolher ? (
          <button key={k.id} type="button" className="hv-kpi" data-tom={k.tom} aria-pressed={ativo === k.id} onClick={() => aoEscolher(ativo === k.id ? null : k.id)}>{corpo}</button>
        ) : (
          <div key={k.id} className="hv-kpi" data-tom={k.tom}>{corpo}</div>
        )
      })}
    </div>
  )
}

export function Filtros<T extends string>({ opcoes, valor, aoMudar, rotulo }: { opcoes: { id: T; rotulo: string; qtd?: number }[]; valor: T; aoMudar: (v: T) => void; rotulo: string }) {
  return (
    <div className="hv-chips" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.id} type="button" className="hv-chip" aria-pressed={valor === o.id} onClick={() => aoMudar(o.id)}>
          {o.rotulo}{o.qtd !== undefined && <span className="hv-chip-qtd">{o.qtd}</span>}
        </button>
      ))}
    </div>
  )
}

export type Visao = 'cartoes' | 'lista'
export function AlternarVisao({ valor, aoMudar }: { valor: Visao; aoMudar: (v: Visao) => void }) {
  return <Filtros rotulo="Forma de ver" valor={valor} aoMudar={aoMudar} opcoes={[{ id: 'lista', rotulo: 'Lista' }, { id: 'cartoes', rotulo: 'Cartões' }]} />
}

export function Abas<T extends string>({ abas, valor, aoMudar, rotulo, idBase }: { abas: { id: T; rotulo: string }[]; valor: T; aoMudar: (v: T) => void; rotulo: string; idBase: string }) {
  return (
    <div className="hv-abas" role="tablist" aria-label={rotulo}>
      {abas.map((a) => (
        <button key={a.id} type="button" role="tab" id={`${idBase}-tab-${a.id}`} aria-selected={valor === a.id} aria-controls={`${idBase}-painel`} onClick={() => aoMudar(a.id)}>{a.rotulo}</button>
      ))}
    </div>
  )
}

/** Barra de ferramentas da lista: filtros à esquerda, busca e forma de ver à direita. */
export function BarraLista({ children }: { children: ReactNode }) {
  return <div className="hv-barra">{children}</div>
}
