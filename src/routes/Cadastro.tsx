import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { useAreas } from '../data/consultas'
import { areasParaLigar, nomeDaArea } from '../data/areas'
import { useLigarArea } from './AreasDeAtuacao'
import { PRODUTOS_PREV, areaPrevidenciaria, lerPlanilha, validarCliente, type NovoCliente, type ResultadoImportacao } from '../data/cadastro'
import { Dialog } from '../design/components/Dialog'
import { Button } from '../design/components/Button'
import { Field } from '../design/components/Field'
import { useToast } from '../design/components/Toast'

const VAZIO: NovoCliente = { nome: '', cpf: '', telefone: '', email: '' }

function CamposCliente({ v, mudar, foco }: { v: NovoCliente; mudar: (v: NovoCliente) => void; foco?: boolean }) {
  return <>
    <Field label="Nome completo" value={v.nome} maxLength={160} autoFocus={foco} autoComplete="off" onChange={(e) => mudar({ ...v, nome: e.target.value })} />
    <Field label="CPF (opcional)" value={v.cpf} inputMode="numeric" maxLength={14} autoComplete="off" onChange={(e) => mudar({ ...v, cpf: e.target.value })} />
    <Field label="Telefone ou WhatsApp (opcional)" value={v.telefone} inputMode="tel" maxLength={20} autoComplete="off" placeholder="(49) 99999-0000" onChange={(e) => mudar({ ...v, telefone: e.target.value })} />
    <Field label="E-mail (opcional)" type="email" value={v.email} maxLength={120} autoComplete="off" onChange={(e) => mudar({ ...v, email: e.target.value })} />
  </>
}

/** Novo cliente. Se o CPF já existir no escritório, abre o cadastro existente em vez de duplicar. */
export function NovoClienteDialog({ aberto, aoFechar, aoCriar }: { aberto: boolean; aoFechar: () => void; aoCriar: (id: string) => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const [v, setV] = useState<NovoCliente>(VAZIO)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (aberto) { setV(VAZIO); setErro(null) } }, [aberto])
  const criar = useMutation({
    mutationFn: () => api.criarCliente(v),
    onSuccess: (r) => {
      toast(r.ja ? 'Esse CPF já estava cadastrado. Abrimos o cadastro existente.' : 'Cliente cadastrado.')
      qc.invalidateQueries({ queryKey: ['clientes', perfil?.escritorioId] })
      aoCriar(r.id)
    },
    onError: (e) => setErro((e as Error).message),
  })
  function enviar(e: FormEvent) {
    e.preventDefault()
    const x = validarCliente(v); if (x) return setErro(x)
    criar.mutate()
  }
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }} title="Novo cliente">
      <form className="hv-dialog-body ficha-form" onSubmit={enviar} noValidate>
        <CamposCliente v={v} mudar={setV} foco />
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          <Button type="submit" disabled={criar.isPending}>{criar.isPending ? 'Salvando…' : 'Cadastrar cliente'}</Button>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </form>
    </Dialog>
  )
}

type Props = { aberto: boolean; aoFechar: () => void; aoCriar: (casoId: string, area: string, cliente: string) => void; clienteId?: string; clienteNome?: string; area?: string }

/** Novo caso: escolhe (ou cadastra) o cliente, a área, o benefício nas áreas previdenciárias, o responsável e o relato. */
export function NovoCasoDialog({ aberto, aoFechar, aoCriar, clienteId, clienteNome, area: areaInicial }: Props) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const areas = useAreas()
  const ligarArea = useLigarArea()
  const gestor = perfil?.papel === 'master' || perfil?.papel === 'code'
  const equipe = useQuery({ queryKey: ['equipe', perfil?.escritorioId], queryFn: () => api.equipe(), enabled: !!perfil && aberto, staleTime: 10 * 60_000 })
  const [modo, setModo] = useState<'buscar' | 'novo'>('buscar')
  const [busca, setBusca] = useState('')
  const [termo, setTermo] = useState('')
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(null)
  const [novo, setNovo] = useState<NovoCliente>(VAZIO)
  const [area, setArea] = useState('')
  const [produto, setProduto] = useState('auxilio_acidente')
  const [responsavel, setResponsavel] = useState('')
  const [relato, setRelato] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    setModo('buscar'); setBusca(''); setTermo(''); setNovo(VAZIO); setProduto('auxilio_acidente'); setResponsavel(''); setRelato(''); setErro(null)
    setCliente(clienteId ? { id: clienteId, nome: clienteNome ?? 'Cliente' } : null)
    setArea(areaInicial ?? areas.data?.[0]?.area ?? '')
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!area && areas.data?.length) setArea(areaInicial ?? areas.data[0].area) }, [areas.data, area, areaInicial])
  useEffect(() => { const t = setTimeout(() => setTermo(busca.trim()), 250); return () => clearTimeout(t) }, [busca])
  const achados = useQuery({
    queryKey: ['clientes', perfil?.escritorioId, termo], queryFn: () => api.clientes(termo),
    enabled: aberto && !cliente && modo === 'buscar' && termo.length >= 2,
  })

  const criar = useMutation({
    mutationFn: async () => {
      let c = cliente
      if (!(areas.data ?? []).some((a) => a.area === area)) await ligarArea.mutateAsync({ area, ativa: true })
      if (!c) { const r = await api.criarCliente(novo); c = { id: r.id, nome: novo.nome.trim() } }
      const id = await api.criarCaso({ cliente: c.id, area, produto: areaPrevidenciaria(area) ? produto : null, relato, responsavel: responsavel || null })
      return { id, cliente: c }
    },
    onSuccess: ({ id, cliente: c }) => {
      toast(`Caso aberto em ${areas.data?.find((a) => a.area === area)?.nome ?? nomeDaArea(area)}.`)
      qc.invalidateQueries({ queryKey: ['quadro', perfil?.escritorioId, area] })
      qc.invalidateQueries({ queryKey: ['cliente', perfil?.escritorioId, c.id] })
      qc.invalidateQueries({ queryKey: ['clientes', perfil?.escritorioId] })
      aoCriar(id, area, c.nome)
    },
    onError: (e) => setErro((e as Error).message),
  })

  function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null)
    if (!cliente) {
      if (modo === 'buscar') return setErro('Escolha o cliente na lista ou cadastre um novo.')
      const x = validarCliente(novo); if (x) return setErro(x)
    }
    if (!area) return setErro('Escolha a área.')
    if (relato.length > 8000) return setErro('Relato com mais de 8.000 letras.')
    criar.mutate()
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }} title="Novo caso">
      <form className="hv-dialog-body ficha-form" onSubmit={enviar} noValidate>
        <fieldset className="cad-grupo">
          <legend>Cliente</legend>
          {cliente ? (
            <p className="cad-escolhido"><strong>{cliente.nome}</strong>
              {!clienteId && <Button size="sm" variant="ghost" onClick={() => setCliente(null)}>Trocar</Button>}</p>
          ) : modo === 'buscar' ? <>
            <div className="hv-field">
              <label htmlFor="cad-busca">Buscar pelo nome</label>
              <input id="cad-busca" className="hv-input" type="search" autoFocus autoComplete="off" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            {termo.length >= 2 && achados.isSuccess && (
              achados.data.length === 0 ? <p className="hv-hint">Nenhum cliente com esse nome.</p> : (
                <ul className="cad-achados">
                  {achados.data.slice(0, 6).map((c) => (
                    <li key={c.id}><button type="button" className="hv-row" onClick={() => setCliente({ id: c.id, nome: c.nome })}>{c.nome}</button></li>
                  ))}
                </ul>
              )
            )}
            <Button size="sm" variant="ghost" onClick={() => { setModo('novo'); setNovo({ ...VAZIO, nome: busca.trim() }) }}>Cadastrar cliente novo</Button>
          </> : <>
            <CamposCliente v={novo} mudar={setNovo} foco />
            <Button size="sm" variant="ghost" onClick={() => setModo('buscar')}>Buscar cliente já cadastrado</Button>
          </>}
        </fieldset>

        <div className="hv-field">
          <label htmlFor="cad-area">Área</label>
          <select id="cad-area" className="hv-input" value={area} onChange={(e) => setArea(e.target.value)} aria-describedby="cad-area-dica">
            <optgroup label="Áreas do escritório">
              {(areas.data ?? []).map((a) => <option key={a.area} value={a.area}>{a.nome}</option>)}
            </optgroup>
            {gestor && areasParaLigar(areas.data ?? []).length > 0 && (
              <optgroup label="Ligar outra área">
                {areasParaLigar(areas.data ?? []).map((a) => <option key={a.area} value={a.area}>{a.nome} (ligar)</option>)}
              </optgroup>
            )}
          </select>
          <span id="cad-area-dica" className="hv-hint">
            {area && !(areas.data ?? []).some((a) => a.area === area)
              ? `Ao abrir o caso, a área ${nomeDaArea(area)} é ligada no escritório e ganha quadro próprio.`
              : gestor ? 'Caso de outra área? Escolha em "Ligar outra área".' : 'Caso de outra área? Peça ao Gestor Master para ligar a área em Configurações.'}
          </span>
        </div>
        {areaPrevidenciaria(area) && (
          <div className="hv-field">
            <label htmlFor="cad-produto">Benefício</label>
            <select id="cad-produto" className="hv-input" value={produto} onChange={(e) => setProduto(e.target.value)}>
              {PRODUTOS_PREV.map((p) => <option key={p.valor} value={p.valor}>{p.nome}</option>)}
            </select>
          </div>
        )}
        <div className="hv-field">
          <label htmlFor="cad-resp">Responsável</label>
          <select id="cad-resp" className="hv-input" value={responsavel} onChange={(e) => setResponsavel(e.target.value)}>
            <option value="">Distribuir pelo rodízio (ou deixar sem)</option>
            {(equipe.data ?? []).map((p) => <option key={p.email} value={p.email}>{p.nome}</option>)}
          </select>
        </div>
        <div className="hv-field">
          <label htmlFor="cad-relato">Relato do cliente (opcional)</label>
          <textarea id="cad-relato" className="hv-input textarea" rows={4} maxLength={8000} value={relato} onChange={(e) => setRelato(e.target.value)}
            placeholder="O que aconteceu, com as palavras do cliente." />
        </div>
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          <Button type="submit" disabled={criar.isPending}>{criar.isPending ? 'Abrindo…' : 'Abrir caso'}</Button>
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </form>
    </Dialog>
  )
}

/** Importação de clientes por planilha (só gestor): sempre mostra a simulação antes de gravar. */
export function ImportarClientesDialog({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const [texto, setTexto] = useState('')
  const [sim, setSim] = useState<ResultadoImportacao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (aberto) { setTexto(''); setSim(null); setErro(null) } }, [aberto])
  const planilha = texto.trim() ? lerPlanilha(texto) : null

  const simular = useMutation({
    mutationFn: () => api.importarClientes(planilha!.clientes, true),
    onSuccess: setSim, onError: (e) => setErro((e as Error).message),
  })
  const gravar = useMutation({
    mutationFn: () => api.importarClientes(planilha!.clientes, false),
    onSuccess: (r) => {
      toast(`${r.novos} ${r.novos === 1 ? 'cliente importado' : 'clientes importados'}.`)
      qc.invalidateQueries({ queryKey: ['clientes', perfil?.escritorioId] }); qc.invalidateQueries({ queryKey: ['duplicados'] })
      aoFechar()
    },
    onError: (e) => setErro((e as Error).message),
  })

  async function lerArquivo(f: File | undefined) {
    if (!f) return
    if (f.size > 2_000_000) return setErro('Arquivo grande demais (até 2 MB).')
    if (/\.xlsx?$/i.test(f.name)) return setErro('Salve a planilha como CSV (Arquivo › Salvar como › CSV) ou copie as células e cole aqui.')
    setTexto(await f.text()); setSim(null); setErro(null)
  }

  const muitas = (planilha?.clientes.length ?? 0) > 1000
  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }} title="Importar clientes">
      <div className="hv-dialog-body ficha-form">
        <p className="hv-hint">Copie as células da planilha (com o cabeçalho: Nome, CPF, Telefone, E-mail) e cole abaixo, ou escolha um arquivo CSV. Primeiro mostramos o que vai acontecer; nada é gravado antes da sua confirmação. Cliente com CPF já cadastrado não é duplicado nem alterado.</p>
        <div className="hv-field">
          <label htmlFor="imp-arquivo">Arquivo CSV</label>
          <input id="imp-arquivo" className="hv-input" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(e) => lerArquivo(e.target.files?.[0])} />
        </div>
        <div className="hv-field">
          <label htmlFor="imp-texto">Ou cole aqui</label>
          <textarea id="imp-texto" className="hv-input textarea" rows={6} value={texto} onChange={(e) => { setTexto(e.target.value); setSim(null); setErro(null) }} />
        </div>
        {planilha && <p className="hv-hint" role="status">{planilha.clientes.length} {planilha.clientes.length === 1 ? 'linha encontrada' : 'linhas encontradas'}.{planilha.aviso && ` ${planilha.aviso}`}</p>}
        {sim && (
          <div className="imp-resumo" role="status">
            <p><strong>{sim.novos}</strong> novos · <strong>{sim.existentes}</strong> já cadastrados · <strong>{sim.erros}</strong> com problema</p>
            {sim.erros > 0 && (
              <ul className="imp-erros">
                {sim.linhas.filter((l) => l.resultado === 'erro').slice(0, 30).map((l) => <li key={l.linha}>Linha {l.linha}{l.nome ? ` (${l.nome})` : ''}: {l.motivo}</li>)}
              </ul>
            )}
            {sim.erros > 0 && <p className="hv-hint">As linhas com problema ficam de fora. Corrija na planilha e importe de novo depois, se quiser.</p>}
          </div>
        )}
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          {!sim ? (
            <Button disabled={!planilha?.clientes.length || muitas || simular.isPending} onClick={() => { setErro(null); simular.mutate() }}>
              {simular.isPending ? 'Conferindo…' : 'Conferir antes de importar'}
            </Button>
          ) : (
            <Button disabled={sim.novos === 0 || gravar.isPending} onClick={() => gravar.mutate()}>
              {gravar.isPending ? 'Importando…' : `Importar ${sim.novos} ${sim.novos === 1 ? 'cliente' : 'clientes'}`}
            </Button>
          )}
          <Button variant="ghost" onClick={aoFechar}>Cancelar</Button>
        </div>
      </div>
    </Dialog>
  )
}
