import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog } from '../design/components/Dialog'
import { useApi, useSessao } from '../lib/contexto'
import { useToast } from '../design/components/Toast'
import { useNavigate } from '@tanstack/react-router'

export const ESPERA_MS = 250
export const MIN_LETRAS = 2

function useAtraso(v: string, ms: number) {
  const [x, setX] = useState(v)
  useEffect(() => { const t = setTimeout(() => setX(v), ms); return () => clearTimeout(t) }, [v, ms])
  return x
}

export function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const api = useApi()
  const { perfil } = useSessao()
  const toast = useToast()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const termo = useAtraso(q.trim(), ESPERA_MS)
  const listaId = useId()
  const r = useQuery({
    queryKey: ['busca', perfil?.escritorioId, termo],
    queryFn: () => api.busca(termo),
    enabled: open && termo.length >= MIN_LETRAS,
  })
  const itens = termo.length >= MIN_LETRAS ? r.data ?? [] : []

  useEffect(() => { if (!open) { setQ(''); setSel(0) } }, [open])
  useEffect(() => { setSel(0) }, [termo])

  function abrir(i: number) {
    const it = itens[i]
    if (!it) return
    onOpenChange(false)
    if (it.clienteId) nav({ to: '/clientes/$id', params: { id: it.clienteId } })
    else toast(`${it.titulo}: não está ligado a um cliente.`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Buscar" hideTitle>
      <div className="busca">
        <label className="sr-only" htmlFor="busca-campo">Buscar</label>
        <input id="busca-campo" className="busca-campo" autoFocus placeholder="Buscar cliente, caso, processo ou CPF"
          value={q} onChange={(e) => setQ(e.target.value)} role="combobox" aria-expanded={itens.length > 0}
          aria-controls={listaId} aria-activedescendant={itens.length ? `${listaId}-${sel}` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, itens.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
            if (e.key === 'Enter') { e.preventDefault(); abrir(sel) }
          }} />
        <ul id={listaId} role="listbox" className="busca-lista" aria-label="Resultados">
          {itens.map((it, i) => (
            <li key={`${it.tipo}-${it.titulo}-${i}`} id={`${listaId}-${i}`} role="option" aria-selected={i === sel}
              className="busca-item" onMouseEnter={() => setSel(i)} onClick={() => abrir(i)}>
              <span className="busca-tipo">{it.tipo}</span>
              <span className="busca-titulo">{it.titulo}</span>
              {it.trecho && <span className="busca-trecho">{it.trecho}</span>}
            </li>
          ))}
        </ul>
        <p className="busca-nota muted" aria-live="polite">
          {termo.length < MIN_LETRAS ? 'Digite pelo menos 2 letras.'
            : r.isFetching ? 'Buscando…'
            : r.isError ? 'Não foi possível buscar agora. Tente de novo.'
            : itens.length === 0 ? 'Nada encontrado.' : `${itens.length} resultado(s). Use as setas e Enter.`}
        </p>
      </div>
    </Dialog>
  )
}
