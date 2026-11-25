import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useSessao } from '../lib/contexto'
import { GRUPOS_MANUAL, MANUAL, type ParteManual } from '../data/manual'
import POS from '../data/manualPosicoes.json'
import { Filtros } from '../design/components/Padrao'
import { Panel } from '../design/components/Panel'
import { posicaoNumero, type Caixa } from './manualFigura'

const W = 1280, H = 800

/** Imagem da tela com caixas destacadas, setas e números. Quem lê no leitor de tela recebe a legenda em texto. */
export function FiguraManual({ parte }: { parte: ParteManual }) {
  const pos = (POS as Record<string, { m: Record<string, Caixa | null> }>)[parte.id]
  const caixas = parte.marcadores.map((k) => ({ k, c: pos?.m[String(k.n)] ?? null })).filter((x): x is { k: typeof x.k; c: Caixa } => !!x.c)
  return (
    <figure className="man-figura">
      <div className="man-quadro">
        <img src={`/manual/${parte.id}.jpg`} alt="" width={W} height={H} loading="lazy" />
        <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="man-setas">
          <defs><marker id={`ponta-${parte.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" className="man-ponta" /></marker></defs>
          {caixas.map(({ k, c }) => {
            const x = (c.x / 100) * W, y = (c.y / 100) * H, w = (c.w / 100) * W, h = (c.h / 100) * H
            const { bx, by } = posicaoNumero(c)
            const alvoX = bx < x ? x + 6 : x + w - 6, alvoY = by < y ? y + 6 : y + Math.min(h, 40)
            return (
              <g key={k.n}>
                <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="10" className="man-caixa" />
                <line x1={bx} y1={by} x2={alvoX} y2={alvoY} className="man-linha" markerEnd={`url(#ponta-${parte.id})`} />
                <circle cx={bx} cy={by} r="17" className="man-bola" />
                <text x={bx} y={by + 6} textAnchor="middle" className="man-num">{k.n}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption>
        <ol className="man-legenda">
          {parte.marcadores.map((k) => <li key={k.n} value={k.n}><span className="man-legenda-n" aria-hidden="true">{k.n}</span>{k.texto}</li>)}
        </ol>
      </figcaption>
    </figure>
  )
}

/** Manual de funcionamento: o que cada área, etapa e função faz, com a tela explicada. */
export function Manual() {
  const { perfil } = useSessao()
  const [grupo, setGrupo] = useState<string>('todos')
  const [busca, setBusca] = useState('')
  const partes = useMemo(() => MANUAL.filter((p) => (!p.coder || perfil?.code) && (grupo === 'todos' || p.grupo === grupo)
    && (!busca.trim() || `${p.titulo} ${p.paraQue} ${p.passos.join(' ')}`.toLowerCase().includes(busca.trim().toLowerCase()))), [grupo, busca, perfil?.code])
  return (
    <div className="pagina man-pagina">
      <div className="pagina-cabeca">
        <div><h1>Manual do HiAdv</h1><p className="muted">O que cada área faz, quem usa e o passo a passo, com a tela explicada.</p></div>
        <div className="pagina-acoes"><Link to="/configuracoes" className="hv-link">Voltar às configurações</Link></div>
      </div>
      <Panel>
        <div className="hv-barra">
          <Filtros rotulo="Assunto" valor={grupo} aoMudar={setGrupo} opcoes={[{ id: 'todos', rotulo: 'Tudo' }, ...GRUPOS_MANUAL.map((g) => ({ id: g, rotulo: g }))]} />
          <label htmlFor="man-busca" className="sr-only">Procurar no manual</label>
          <input id="man-busca" className="hv-input" type="search" placeholder="Procurar no manual" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <nav aria-label="Partes do manual" className="hv-panel-body man-indice">
          {partes.map((p) => <a key={p.id} href={`#man-${p.id}`}>{p.titulo}</a>)}
        </nav>
      </Panel>
      {partes.length === 0 && <p className="muted">Nada encontrado com essa busca.</p>}
      {partes.map((p) => (
        <section key={p.id} id={`man-${p.id}`} className="man-parte" aria-labelledby={`man-t-${p.id}`}>
          <h2 id={`man-t-${p.id}`}>{p.titulo}</h2>
          <p className="man-quem"><strong>Quem usa:</strong> {p.quem}</p>
          <p>{p.paraQue}</p>
          <FiguraManual parte={p} />
          <h3>Passo a passo</h3>
          <ol className="man-passos">{p.passos.map((x) => <li key={x}>{x}</li>)}</ol>
        </section>
      ))}
    </div>
  )
}
