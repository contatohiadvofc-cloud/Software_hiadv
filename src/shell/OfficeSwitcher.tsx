import { useEffect, useRef, useState } from 'react'
import { useEscritorios } from '../data/consultas'
import { useSessao } from '../lib/contexto'
import { useToast } from '../design/components/Toast'

const iniciais = (n: string) => n.replace(/\(.*?\)/g, '').split(/\s+|&/).filter((p) => p && p.length > 2).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || n.slice(0, 2).toUpperCase()

/** Escritório em uso. Para quem tem acesso Coder, abre uma lista própria para trocar de escritório. */
export function OfficeSwitcher() {
  const sessao = useSessao()
  const lista = useEscritorios()
  const toast = useToast()
  const [aberto, setAberto] = useState(false)
  const [trocando, setTrocando] = useState(false)
  const [busca, setBusca] = useState('')
  const caixa = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const nome = sessao.perfil?.escritorioNome || 'Escritório'
  const atual = sessao.perfil?.escritorioId ?? ''

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAberto(false); botao.current?.focus() } }
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', tecla)
    requestAnimationFrame(() => caixa.current?.querySelector<HTMLElement>('[aria-selected="true"], [role="option"]')?.focus())
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla) }
  }, [aberto])

  const cabeca = (
    <>
      <span className="esc-avatar" aria-hidden="true">{iniciais(nome)}</span>
      <span className="esc-textos"><span className="escritorio-rotulo">Escritório em uso</span><span className="escritorio-nome">{nome}</span></span>
    </>
  )
  if (!sessao.perfil?.code || !lista.data || lista.data.length < 2) return <div className="escritorio">{cabeca}</div>

  const itens = lista.data.filter((o) => o.nome.toLowerCase().includes(busca.trim().toLowerCase()))
  async function trocar(id: string) {
    if (id === atual) { setAberto(false); return }
    setTrocando(true)
    try { await sessao.trocarEscritorio(id); toast('Escritório trocado.'); setAberto(false) }
    catch (x) { toast((x as Error).message, 'danger') }
    finally { setTrocando(false) }
  }
  function mover(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const ops = [...(caixa.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
    const i = ops.indexOf(document.activeElement as HTMLElement)
    ops[(i + (e.key === 'ArrowDown' ? 1 : -1) + ops.length) % ops.length]?.focus()
  }

  return (
    <div className="esc-troca" ref={caixa}>
      <button ref={botao} type="button" className="escritorio esc-botao" aria-haspopup="listbox" aria-expanded={aberto} disabled={trocando} onClick={() => setAberto((a) => !a)}>
        {cabeca}
        <svg className="esc-seta" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 6.5 8 10l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {aberto && (
        <div className="esc-pop" onKeyDown={mover}>
          {lista.data.length > 5 && <input className="hv-input esc-busca" placeholder="Buscar escritório" aria-label="Buscar escritório" value={busca} onChange={(e) => setBusca(e.target.value)} />}
          <ul role="listbox" aria-label="Escritórios">
            {itens.map((o) => (
              <li key={o.id} role="option" tabIndex={-1} aria-selected={o.id === atual} className="esc-opcao"
                onClick={() => trocar(o.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trocar(o.id) } }}>
                <span className="esc-avatar" aria-hidden="true">{iniciais(o.nome)}</span>
                <span className="esc-opcao-nome">{o.nome}</span>
                {o.id === atual && <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </li>
            ))}
            {!itens.length && <li className="esc-vazio">Nenhum escritório com esse nome.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
