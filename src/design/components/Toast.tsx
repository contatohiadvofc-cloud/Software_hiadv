import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type AcaoAviso = { rotulo: string; fazer: () => void }
type Aviso = { id: number; msg: string; tone: 'neutral' | 'danger'; acao?: AcaoAviso }
const Ctx = createContext<(msg: string, tone?: Aviso['tone'], acao?: AcaoAviso) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([])
  const toast = useCallback((msg: string, tone: Aviso['tone'] = 'neutral', acao?: AcaoAviso) => {
    const id = Date.now() + Math.random()
    setLista((l) => [...l, { id, msg, tone, acao }])
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), acao ? 7000 : 4500)
  }, [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="hv-toasts" role="status" aria-live="polite">
        {lista.map((a) => (
          <div key={a.id} className="hv-toast" data-tone={a.tone}>
            <span>{a.msg}</span>
            {a.acao && <button type="button" className="hv-toast-acao" onClick={() => { a.acao!.fazer(); setLista((l) => l.filter((x) => x.id !== a.id)) }}>{a.acao.rotulo}</button>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
