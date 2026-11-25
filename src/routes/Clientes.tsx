import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { telefoneTela } from '../data/clientes'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'
import { ImportarClientesDialog, NovoClienteDialog } from './Cadastro'
import { AlternarVisao, type Visao } from '../design/components/Padrao'

const desdeFmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' })

function Duplicados() {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['duplicados', perfil?.escritorioId], queryFn: () => api.duplicados(), enabled: !!perfil })
  const ignorar = useMutation({
    mutationFn: ({ a, b }: { a: string; b: string }) => api.ignorarDuplicado(a, b),
    onSuccess: () => { toast('Marcado como pessoas diferentes.'); qc.invalidateQueries({ queryKey: ['duplicados'] }) },
    onError: (e) => toast((e as Error).message),
  })
  const pares = q.data ?? []
  if (!q.isSuccess || pares.length === 0) return null
  return (
    <Panel title="Possíveis duplicados" labelId="h-duplicados">
      <p className="hv-panel-body muted">Confira se são a mesma pessoa. Nada é juntado sozinho: se forem a mesma, mantenha um cadastro e passe os casos para ele.</p>
      <ul className="seu-dia-lista">
        {pares.map((p) => (
          <li key={`${p.a.id}-${p.b.id}`} className="hv-row atencao-item">
            <span className="tipo">{p.motivos.join(' · ')}</span>
            <span className="texto">
              <Link to="/clientes/$id" params={{ id: p.a.id }} className="titulo">{p.a.nome}</Link>
              <Link to="/clientes/$id" params={{ id: p.b.id }} className="sub">{p.b.nome}</Link>
            </span>
            <span className="atencao-acao"><Button size="sm" variant="ghost" disabled={ignorar.isPending} onClick={() => ignorar.mutate({ a: p.a.id, b: p.b.id })}>São pessoas diferentes</Button></span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function Clientes() {
  const api = useApi()
  const { perfil } = useSessao()
  const [texto, setTexto] = useState('')
  const [termo, setTermo] = useState('')
  const [visao, setVisao] = useState<Visao>('lista')
  const [dialogo, setDialogo] = useState<'novo' | 'importar' | null>(null)
  const nav = useNavigate()
  useEffect(() => { const t = setTimeout(() => setTermo(texto.trim()), 250); return () => clearTimeout(t) }, [texto])
  const gestor = perfil?.papel === 'master' || !!perfil?.code
  const q = useQuery({ queryKey: ['clientes', perfil?.escritorioId, termo.length >= 2 ? termo : ''], queryFn: () => api.clientes(termo), enabled: !!perfil })

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Clientes</h1>{q.isSuccess && <p className="muted">{q.data.length === 100 ? 'Mostrando os 100 primeiros' : `${q.data.length} ${q.data.length === 1 ? 'cliente' : 'clientes'}`}</p>}</div>
        <div className="pagina-acoes">
          {gestor && <Button variant="secondary" onClick={() => setDialogo('importar')}>Importar planilha</Button>}
          <Button onClick={() => setDialogo('novo')}>Novo cliente</Button>
        </div>
      </div>
      <NovoClienteDialog aberto={dialogo === 'novo'} aoFechar={() => setDialogo(null)} aoCriar={(id) => { setDialogo(null); nav({ to: '/clientes/$id', params: { id } }) }} />
      {gestor && <ImportarClientesDialog aberto={dialogo === 'importar'} aoFechar={() => setDialogo(null)} />}
      {gestor && <Duplicados />}

      <Panel>
        <div className="hv-barra">
          <label htmlFor="cli-busca" className="sr-only">Filtrar clientes pelo nome</label>
          <input id="cli-busca" className="hv-input" type="search" placeholder="Filtrar pelo nome" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <AlternarVisao valor={visao} aoMudar={setVisao} />
        </div>
        {q.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {q.isSuccess && q.data.length === 0 && <Empty title={termo.length >= 2 ? 'Nenhum cliente com esse nome.' : 'Nenhum cliente cadastrado ainda.'} />}
        {q.isSuccess && q.data.length > 0 && visao === 'cartoes' && (
          <ul className="hv-cartoes">
            {q.data.map((c) => (
              <li key={c.id}>
                <Link to="/clientes/$id" params={{ id: c.id }} className="hv-cartao">
                  <span className="cliente-inicial" aria-hidden="true">{c.nome.charAt(0)}</span>
                  <span className="fin-titulo">{c.nome}</span>
                  {c.telefone && <span className="fin-sub">{telefoneTela(c.telefone)}</span>}
                  {c.desde && <span className="fin-sub">Desde {desdeFmt.format(new Date(c.desde)).replace('.', '')}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {q.isSuccess && q.data.length > 0 && visao === 'lista' && (
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
