import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ROTEIRO, emPrevia, encerrarPrevia, marcarVista, minutosRestantes } from './previa'

/** Faixa da prévia: onde você está, o que experimentar aqui, o roteiro completo e o convite para o teste de verdade. */
export function BarraPrevia() {
  const loc = useLocation()
  const nav = useNavigate()
  const [min, setMin] = useState(minutosRestantes)
  const [vistas, setVistas] = useState<string[]>([])
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => { setVistas(marcarVista(loc.pathname)) }, [loc.pathname])
  useEffect(() => { const t = setInterval(() => setMin(minutosRestantes()), 15000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])
  if (!emPrevia()) return null
  const aqui = ROTEIRO.find((p) => loc.pathname === p.rota || loc.pathname.startsWith(p.rota + '/'))
  const proxima = ROTEIRO.find((p) => !vistas.includes(p.rota) && p.rota !== aqui?.rota)
  const sair = (destino: string) => { encerrarPrevia(); location.assign(destino) }
  const pct = Math.round((vistas.length / ROTEIRO.length) * 100)

  if (min <= 0) return (
    <div className="previa-fim" role="dialog" aria-modal="true" aria-labelledby="previa-fim-t">
      <div className="previa-fim-caixa">
        <h2 id="previa-fim-t">A prévia terminou</h2>
        <p>Você viu {vistas.length} de {ROTEIRO.length} partes do HiAdv com um escritório fictício. Nada do que foi feito aqui ficou guardado.</p>
        <p>No teste de 14 dias é o seu escritório: as suas OABs puxando as publicações, os seus clientes e os seus prazos, e tudo continua lá quando você contratar.</p>
        <a className="previa-cta" href="/aderir" onClick={(e) => { e.preventDefault(); sair('/aderir') }}>Começar meu teste de 14 dias</a>
        <a className="previa-link" href="/#planos" onClick={(e) => { e.preventDefault(); sair('/#planos') }}>Ver os planos</a>
      </div>
    </div>
  )

  return (
    <div className="previa-barra" role="region" aria-label="Prévia do HiAdv" ref={caixa}>
      <span className="previa-selo">Prévia</span>
      <p className="previa-aqui">
        {aqui ? <><strong>{aqui.titulo}</strong><span className="previa-tente">{aqui.tente}</span></> : <strong>Escritório fictício</strong>}
        <span className="previa-meta">Dados fictícios, nada é salvo · {min} min</span>
      </p>
      <button type="button" className="previa-roteiro-btn" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        <span className="previa-anel" style={{ '--p': `${pct}%` } as React.CSSProperties} aria-hidden="true" />
        Roteiro {vistas.length}/{ROTEIRO.length}
      </button>
      {proxima && <button type="button" className="previa-proxima" onClick={() => nav({ to: proxima.rota })}>Próximo: {proxima.titulo}</button>}
      <a className="previa-cta" href="/aderir" onClick={(e) => { e.preventDefault(); sair('/aderir') }}><span className="previa-cta-longo">Testar com meus dados</span><span className="previa-cta-curto">Teste grátis</span></a>
      {aberto && (
        <div className="previa-painel">
          <div className="previa-painel-cabeca"><strong>Roteiro da prévia</strong><span>{vistas.length} de {ROTEIRO.length} vistos</span></div>
          <ol className="previa-roteiro">
            {ROTEIRO.map((p, i) => (
              <li key={p.rota} data-visto={vistas.includes(p.rota) || undefined} data-aqui={p.rota === aqui?.rota || undefined}>
                <button type="button" onClick={() => { setAberto(false); nav({ to: p.rota }) }}>
                  <span className="previa-num" aria-hidden="true">{vistas.includes(p.rota) ? '✓' : i + 1}</span>
                  <span className="previa-item"><span className="previa-item-t">{p.titulo} <small>{p.plano}</small></span><span className="previa-item-d">{p.texto}</span></span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
