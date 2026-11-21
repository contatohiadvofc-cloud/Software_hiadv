import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { Button } from '../design/components/Button'

/** Busca de cliente simples, para os formulários do financeiro. */
export function EscolherCliente({ valor, aoEscolher, opcional }: { valor: { id: string; nome: string } | null; aoEscolher: (c: { id: string; nome: string } | null) => void; opcional?: boolean }) {
  const api = useApi()
  const { perfil } = useSessao()
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  useEffect(() => { const t = setTimeout(() => setTermo(busca.trim()), 250); return () => clearTimeout(t) }, [busca])
  const q = useQuery({ queryKey: ['clientes', perfil?.escritorioId, termo], queryFn: () => api.clientes(termo), enabled: !valor && termo.length >= 2 })
  if (valor) return <p className="cad-escolhido"><span>Cliente: <strong>{valor.nome}</strong></span><Button size="sm" variant="ghost" onClick={() => aoEscolher(null)}>Trocar</Button></p>
  return (
    <div className="hv-field">
      <label htmlFor="fin-cliente">{opcional ? 'Cliente (opcional)' : 'Cliente'}</label>
      <input id="fin-cliente" className="hv-input" type="search" autoComplete="off" placeholder="Buscar pelo nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {termo.length >= 2 && q.isSuccess && (q.data.length === 0 ? <span className="hv-hint">Nenhum cliente com esse nome.</span> : (
        <ul className="cad-achados">{q.data.slice(0, 6).map((c) => <li key={c.id}><button type="button" className="hv-row" onClick={() => aoEscolher({ id: c.id, nome: c.nome })}>{c.nome}</button></li>)}</ul>
      ))}
    </div>
  )
}

