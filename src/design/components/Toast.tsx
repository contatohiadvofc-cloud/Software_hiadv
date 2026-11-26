import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type AcaoAviso = { rotulo: string; fazer: () => void }
type Aviso = { id: number; msg: string; tone: 'neutral' | 'danger'; acao?: AcaoAviso }
const Ctx = createContext<(msg: string, tone?: Aviso['tone'], acao?: AcaoAviso) => void>(() => {})
const MAX = 3

/** Aviso que some sozinho, mas pausa enquanto o mouse ou o dedo está nele, e pode ser fechado. */
function Item({ a, fechar }: { a: Aviso; fechar: () => void }) {
  const tempo = a.acao ? 7000 : a.tone === 'danger' ? 6500 : 4500
  const restante = useRef(tempo)
  const inicio = useRef(Date.now())
  const t = useRef<ReturnType<typeof setTimeout>>(undefined)
  const iniciar = () => { inicio.current = Date.now(); t.current = setTimeout(fechar, restante.current) }
  const pausar = () => { clearTimeout(t.current); restante.current -= Date.now() - inicio.current }
  useEffect(() => { iniciar(); return () => clearTimeout(t.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="hv-toast" data-tone={a.tone} onMouseEnter={pausar} onMouseLeave={iniciar} onFocus={pausar} onBlur={iniciar}>
      <span>{a.msg}</span>
      {a.acao && <button type="button" className="hv-toast-acao" onClick={() => { a.acao!.fazer(); fechar() }}>{a.acao.rotulo}</button>}
      <button type="button" className="hv-toast-x" aria-label="Fechar aviso" onClick={fechar}>×</button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([])
  const toast = useCallback((msg: string, tone: Aviso['tone'] = 'neutral', acao?: AcaoAviso) => {
    const id = Date.now() + Math.random()
    // o mesmo aviso repetido não empilha
    setLista((l) => [...l.filter((x) => x.msg !== msg), { id, msg, tone, acao }].slice(-MAX))
  }, [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="hv-toasts" role="status" aria-live="polite">
        {lista.map((a) => <Item key={a.id} a={a} fechar={() => setLista((l) => l.filter((x) => x.id !== a.id))} />)}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
