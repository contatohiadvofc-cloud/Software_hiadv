import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { useAreas, useRecursos } from '../data/consultas'
import { linkWhatsapp, telefoneTela, type CasoDoCliente } from '../data/clientes'
import { rotuloEtapa } from '../data/quadro'
import { nomeDe } from '../data/tarefas'
import { quandoTexto } from '../data/seuDia'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Badge } from '../design/components/Badge'
import { FichaCaso } from './FichaCaso'
import { NovoCasoDialog } from './Cadastro'
import { HonorariosCliente } from './HonorariosCliente'
import { DadosCliente } from './DadosCliente'
import { AcompanhamentoCliente } from './AcompanhamentoCliente'
import { HorasCliente } from './HorasCliente'
import { GerarDocumentoDialog } from './GerarDocumento'
import { AssistenteIA } from './AssistenteIA'
import { Button } from '../design/components/Button'

export function Cliente() {
  const { id } = useParams({ strict: false }) as { id: string }
  const api = useApi()
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || perfil?.papel === 'code'
  const recursos = useRecursos()
  const areas = useAreas()
  const q = useQuery({ queryKey: ['cliente', perfil?.escritorioId, id], queryFn: () => api.cliente(id), enabled: !!perfil })
  const equipe = useQuery({ queryKey: ['equipe', perfil?.escritorioId], queryFn: () => api.equipe(), enabled: !!perfil, staleTime: 10 * 60_000 })
  const [aberto, setAberto] = useState<CasoDoCliente | null>(null)
  const [novoCaso, setNovoCaso] = useState(false)
  const [gerarDoc, setGerarDoc] = useState(false)
  const [ia, setIa] = useState(false)
  const nomeArea = (a: string) => areas.data?.find((x) => x.area === a)?.nome ?? rotuloEtapa(a)
  const agora = new Date()

  if (q.isLoading) return <div className="pagina"><p className="muted" role="status">Carregando…</p></div>
  if (q.isError) return <div className="pagina"><Panel><ErrorState onRetry={() => q.refetch()} /></Panel></div>
  if (!q.data) return null
  const { cliente: c, casos, processos, tarefas } = q.data
  const wa = linkWhatsapp(c.telefone)

  return (
    <div className="pagina">
      <p className="migalha"><Link to="/clientes">Clientes</Link></p>
      <div className="pagina-cabeca">
        <div>
          <h1>{c.nome}</h1>
          <p className="muted cliente-contato">
            {c.telefone ? telefoneTela(c.telefone) : 'Sem telefone cadastrado'}
            {wa && <> · <a href={wa} target="_blank" rel="noopener noreferrer">Abrir no WhatsApp</a></>}
          </p>
        </div>
        <div className="pagina-acoes">
          {recursos.pode('ia') && <Button variant="secondary" onClick={() => setIa(true)}>Assistente de IA</Button>}
          <Button variant="secondary" onClick={() => setGerarDoc(true)}>Gerar documento</Button>
          <Button onClick={() => setNovoCaso(true)}>Novo caso</Button>
        </div>
      </div>
      {ia && <AssistenteIA open={ia} onOpenChange={setIa} ctx={{
        cliente: { id: c.id, nome: c.nome },
        casos: casos.map((k) => ({ id: k.id, descricao: [k.produto, nomeArea(k.area)].filter(Boolean).join(' · '), dados: { 'benefício': k.produto, 'área': nomeArea(k.area), 'etapa': rotuloEtapa(k.status) } })),
      }} />}
      <GerarDocumentoDialog aberto={gerarDoc} aoFechar={() => setGerarDoc(false)} cliente={{ id: c.id, nome: c.nome }} />
      <NovoCasoDialog aberto={novoCaso} aoFechar={() => setNovoCaso(false)} clienteId={c.id} clienteNome={c.nome}
        aoCriar={(id, area) => { setNovoCaso(false); setAberto({ id, area, status: '', produto: null }) }} />

      <div className="cliente-grade">
        <Panel title="Casos" labelId="cli-casos">
          {casos.length === 0 ? <Empty title="Nenhum caso deste cliente." /> : (
            <ul className="seu-dia-lista">
              {casos.map((k) => (
                <li key={k.id}>
                  <button type="button" className="hv-row cliente-caso" onClick={() => setAberto(k)}>
                    <span className="texto"><span className="titulo">{k.produto ?? 'Caso'}</span><span className="sub">{nomeArea(k.area)}</span></span>
                    <Badge tone="info">{rotuloEtapa(k.status)}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Processos" labelId="cli-proc">
          {processos.length === 0 ? <Empty title="Nenhum processo cadastrado." /> : (
            <ul className="seu-dia-lista">
              {processos.map((p) => (
                <li key={p.id} className="hv-row cliente-caso">
                  <span className="texto"><span className="titulo">{p.numeroCnj ?? 'Sem número'}</span><span className="sub">{[p.classe, p.orgao].filter(Boolean).join(' · ')}</span></span>
                  {!p.ativo && <Badge>Encerrado</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <DadosCliente clienteId={c.id} />
        {gestor && recursos.pode('financeiro') && <HonorariosCliente cliente={{ id: c.id, nome: c.nome }} />}
        {recursos.pode('acompanhamento') && <AcompanhamentoCliente cliente={{ id: c.id, nome: c.nome, telefone: c.telefone }} />}
        {recursos.pode('horas') && <HorasCliente clienteId={c.id} />}
        <Panel title="Tarefas abertas" labelId="cli-tar">
          {tarefas.length === 0 ? <Empty title="Nenhuma tarefa aberta para este cliente." /> : (
            <ul className="seu-dia-lista">
              {tarefas.map((t) => (
                <li key={t.id} className="hv-row cliente-caso">
                  <span className="texto"><span className="titulo">{t.titulo}</span><span className="sub">{nomeDe(t.responsavel, equipe.data ?? [])}</span></span>
                  <span className="quando">{quandoTexto({ id: t.id, tipo: 'tarefa', titulo: '', sub: '', dia: t.prazo, hora: null, quem: '' }, agora)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <FichaCaso casoId={aberto?.id ?? null} nome={c.nome} aoFechar={() => setAberto(null)} />
    </div>
  )
}
