import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Aviso = { id: number; msg: string; tone: 'neutral' | 'danger' }
const Ctx = createContext<(msg: string, tone?: Aviso['tone']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([])
  const toast = useCallback((msg: string, tone: Aviso['tone'] = 'neutral') => {
    const id = Date.now() + Math.random()
    setLista((l) => [...l, { id, msg, tone }])
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), 4500)
  }, [])
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="hv-toasts" role="status" aria-live="polite">
        {lista.map((a) => <div key={a.id} className="hv-toast" data-tone={a.tone}>{a.msg}</div>)}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
