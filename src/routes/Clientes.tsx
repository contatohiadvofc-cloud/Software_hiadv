import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { telefoneTela } from '../data/clientes'

const desdeFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' })

export function Clientes() {
  const api = useApi()
  const { perfil } = useSessao()
  const [texto, setTexto] = useState('')
  const [termo, setTermo] = useState('')
  useEffect(() => { const t = setTimeout(() => setTermo(texto.trim()), 250); return () => clearTimeout(t) }, [texto])
  const q = useQuery({ queryKey: ['clientes', perfil?.escritorioId, termo.length >= 2 ? termo : ''], queryFn: () => api.clientes(termo), enabled: !!perfil })

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Clientes</h1>{q.isSuccess && <p className="muted">{q.data.length === 100 ? 'Mostrando os 100 primeiros' : `${q.data.length} ${q.data.length === 1 ? 'cliente' : 'clientes'}`}</p>}</div>
      </div>
      <div className="hv-field filtro-largo">
        <label htmlFor="cli-busca" className="sr-only">Filtrar clientes pelo nome</label>
        <input id="cli-busca" className="hv-input" type="search" placeholder="Filtrar pelo nome" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      <Panel>
        {q.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {q.isSuccess && q.data.length === 0 && <Empty title={termo.length >= 2 ? 'Nenhum cliente com esse nome.' : 'Nenhum cliente cadastrado ainda.'} />}
        {q.isSuccess && q.data.length > 0 && (
          <ul className="seu-dia-lista">
            {q.data.map((c) => (
              <li key={c.id}>
                <Link to="/clientes/$id" params={{ id: c.id }} className="hv-row cliente-linha">
                  <span className="cliente-inicial" aria-hidden="true">{c.nome.charAt(0)}</span>
                  <span className="texto"><span className="titulo">{c.nome}</span>{c.telefone && <span className="sub">{telefoneTela(c.telefone)}</span>}</span>
                  <span className="quem">{c.desde ? `Desde ${desdeFmt.format(new Date(c.desde)).replace('.', '')}` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
