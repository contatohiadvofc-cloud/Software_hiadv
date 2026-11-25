import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { ROTEIRO, emPrevia, encerrarPrevia, marcarVista, minutosRestantes } from './previa'

/** Faixa fixa da prévia: tempo, roteiro e o convite para o teste com os dados do escritório. */
export function BarraPrevia() {
  const loc = useLocation()
  const nav = useNavigate()
  const [min, setMin] = useState(minutosRestantes)
  const [vistas, setVistas] = useState<string[]>([])
  const [aberto, setAberto] = useState(false)
  useEffect(() => { setVistas(marcarVista(loc.pathname)) }, [loc.pathname])
  useEffect(() => { const t = setInterval(() => setMin(minutosRestantes()), 15000); return () => clearInterval(t) }, [])
  if (!emPrevia()) return null
  const proxima = ROTEIRO.find((p) => !vistas.includes(p.rota))
  const sair = (destino: string) => { encerrarPrevia(); location.assign(destino) }

  if (min <= 0) return (
    <div className="previa-fim" role="dialog" aria-modal="true" aria-labelledby="previa-fim-t">
      <div className="previa-fim-caixa">
        <h2 id="previa-fim-t">A prévia terminou</h2>
        <p>Você viu {vistas.length} de {ROTEIRO.length} partes do HiAdv com um escritório fictício. Nada do que foi feito aqui ficou guardado.</p>
        <p>No teste de 14 dias, é o seu escritório: suas OABs puxando as publicações, seus clientes e seus prazos, e tudo continua lá quando você contratar.</p>
        <a className="previa-cta" href="/aderir" onClick={(e) => { e.preventDefault(); sair('/aderir') }}>Começar meu teste de 14 dias</a>
        <a className="previa-link" href="/#planos" onClick={(e) => { e.preventDefault(); sair('/#planos') }}>Ver os planos</a>
      </div>
    </div>
  )

  return (
    <div className="previa-barra" role="region" aria-label="Prévia do HiAdv">
      <p><strong>Prévia</strong> com dados fictícios. Nada é salvo. {min} min restantes.</p>
      <button type="button" className="previa-roteiro-btn" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>Roteiro {vistas.length}/{ROTEIRO.length}</button>
      <a className="previa-cta" href="/aderir" onClick={(e) => { e.preventDefault(); sair('/aderir') }}>Testar com meus dados</a>
      {aberto && (
        <ol className="previa-roteiro">
          {ROTEIRO.map((p) => (
            <li key={p.rota} data-visto={vistas.includes(p.rota) || undefined}>
              <button type="button" onClick={() => { setAberto(false); nav({ to: p.rota }) }}>
                <span>{p.titulo}</span> <small>{p.plano}</small>
              </button>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      )}
      {!aberto && proxima && proxima.rota !== loc.pathname && (
        <button type="button" className="previa-proxima" onClick={() => nav({ to: proxima.rota })}>Próximo: {proxima.titulo}</button>
      )}
    </div>
  )
}
