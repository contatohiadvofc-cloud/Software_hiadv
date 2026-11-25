import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { useAreas } from '../data/consultas'
import { situacaoPacote, TIPOS_BIBLIOTECA, tamanhoTela, validarArquivo, EXTENSOES_BIBLIOTECA, type ItemBiblioteca, type NovoItemBiblioteca, type TipoBiblioteca } from '../data/escritorio'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Button } from '../design/components/Button'
import { Dialog } from '../design/components/Dialog'
import { useToast } from '../design/components/Toast'
import { GerarDocumentoDialog } from './GerarDocumento'
import { VARIAVEIS } from '../data/modelos'

const VAZIO: NovoItemBiblioteca = { tipo: 'modelo', titulo: '', area: '', peca: '', conteudo: '', link: '' }
const PECAS = ['Kit do cliente', 'Requerimento administrativo', 'Petição inicial', 'Quesitos', 'Manifestação sobre laudo', 'Réplica', 'Recurso', 'Contestação']

function Pacotes() {
  const api = useApi()
  const qc = useQueryClient()
  const toast = useToast()
  const { perfil } = useSessao()
  const q = useQuery({ queryKey: ['pacotes', perfil?.escritorioId], queryFn: () => api.pacotes(), enabled: !!perfil })
  const adicionar = useMutation({
    mutationFn: (slug: string) => api.adicionarPacote(slug),
    onSuccess: (n) => {
      toast(n > 0 ? `${n} roteiros adicionados à sua biblioteca. Edite à vontade: a cópia é do seu escritório.` : 'Esses roteiros já estavam na sua biblioteca.')
      qc.invalidateQueries({ queryKey: ['pacotes'] }); qc.invalidateQueries({ queryKey: ['biblioteca'] })
    },
    onError: (e) => toast((e as Error).message),
  })
  if (!q.isSuccess || q.data.length === 0) return null
  return (
    <Panel title="Roteiros prontos do HiAdv" labelId="h-pacotes">
      <p className="hv-panel-body muted">Passo a passo de cada peça, com documentos de entrada, estrutura e cuidados. Ao adicionar, o escritório recebe uma cópia para ajustar ao seu jeito; os agentes também usam esses roteiros.</p>
      <ul className="pacotes">
        {q.data.map((p) => {
          const s = situacaoPacote(p)
          return (
            <li key={p.slug} className="pacote">
              <div className="pacote-cabeca">
                <h3>{p.nome} <span className="muted">· {p.itens} roteiros</span></h3>
                <Button size="sm" variant={s.pronto ? 'ghost' : 'secondary'} disabled={s.pronto || adicionar.isPending} onClick={() => adicionar.mutate(p.slug)}>{s.botao}</Button>
              </div>
              <p className="muted">{p.descricao}</p>
              <details><summary>Ver a lista</summary><ul className="pacote-lista">{p.titulos.map((t) => <li key={t}>{t}</li>)}</ul></details>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export function Biblioteca() {
  const api = useApi()
  const { perfil } = useSessao()
  const qc = useQueryClient()
  const toast = useToast()
  const areas = useAreas()
  const gestor = perfil?.papel === 'master' || !!perfil?.code
  const [tipo, setTipo] = useState<TipoBiblioteca>('modelo')
  const [filtro, setFiltro] = useState('')
  const [aberto, setAberto] = useState<{ id: string | null } | null>(null)
  const [form, setForm] = useState<NovoItemBiblioteca>(VAZIO)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [retirando, setRetirando] = useState<ItemBiblioteca | null>(null)
  const [usando, setUsando] = useState<ItemBiblioteca | null>(null)
  const chave = ['biblioteca', perfil?.escritorioId]
  const q = useQuery({ queryKey: chave, queryFn: () => api.biblioteca(), enabled: !!perfil })
  const nomeArea = (a: string | null) => (a ? areas.data?.find((x) => x.area === a)?.nome ?? a : 'Todas as áreas')
  const meta = TIPOS_BIBLIOTECA.find((t) => t.tipo === tipo)!

  const itens = useMemo(() => {
    const t = filtro.trim().toLowerCase()
    return (q.data ?? []).filter((b) => b.tipo === tipo && (!t || `${b.titulo} ${b.peca ?? ''} ${b.conteudo ?? ''}`.toLowerCase().includes(t)))
  }, [q.data, tipo, filtro])
  const contagem = (t: TipoBiblioteca) => (q.data ?? []).filter((b) => b.tipo === t).length

  const salvar = useMutation({
    mutationFn: () => api.salvarBiblioteca(aberto!.id, form, arquivo),
    onSuccess: () => { toast(aberto?.id ? 'Item atualizado.' : 'Incluído na Biblioteca.'); setAberto(null); qc.invalidateQueries({ queryKey: chave }) },
    onError: (e) => setErro((e as Error).message),
  })
  const retirar = useMutation({
    mutationFn: (id: string) => api.retirarBiblioteca(id),
    onSuccess: () => { toast('Item retirado da Biblioteca.'); setRetirando(null); qc.invalidateQueries({ queryKey: chave }) },
    onError: (e) => toast(`Não foi possível: ${(e as Error).message}`, 'danger'),
  })
  const abrirArquivo = useMutation({
    mutationFn: (caminho: string) => api.linkArquivo(caminho),
    onSuccess: (url) => window.open(url, '_blank', 'noopener'),
    onError: (e) => toast((e as Error).message, 'danger'),
  })

  function novo() { setForm({ ...VAZIO, tipo }); setArquivo(null); setErro(null); setAberto({ id: null }) }
  function editar(b: ItemBiblioteca) {
    setForm({ tipo: b.tipo, titulo: b.titulo, area: b.area ?? '', peca: b.peca ?? '', conteudo: b.conteudo ?? '', link: b.link ?? '' })
    setArquivo(null); setErro(null); setAberto({ id: b.id })
  }
  function enviar(e: FormEvent) {
    e.preventDefault()
    if (form.titulo.trim().length < 2) return setErro('Dê um título.')
    if (arquivo) { const m = validarArquivo(arquivo); if (m) return setErro(m) }
    if (form.link.trim() && !/^https?:\/\//i.test(form.link.trim())) return setErro('O link deve começar com http:// ou https://.')
    if (!aberto?.id && !arquivo && !form.link.trim() && !form.conteudo.trim()) return setErro('Anexe um arquivo, cole o texto ou informe um link.')
    setErro(null); salvar.mutate()
  }

  return (
    <div className="pagina">
      <div className="pagina-cabeca">
        <div><h1>Biblioteca</h1><p className="muted">Modelos e fontes do escritório. Os agentes só usam o que estiver aqui.</p></div>
        <div className="pagina-acoes"><Button onClick={novo}>Incluir</Button></div>
      </div>

      <div className="etapas-abas biblioteca-abas" role="tablist" aria-label="Tipo">
        {TIPOS_BIBLIOTECA.map((t) => (
          <button key={t.tipo} type="button" role="tab" className="etapa-aba" aria-selected={tipo === t.tipo} onClick={() => setTipo(t.tipo)}>
            {t.plural} <span className="etapa-aba-n">{contagem(t.tipo)}</span>
          </button>
        ))}
      </div>
      <p className="muted biblioteca-ajuda">{meta.ajuda}</p>
      <div className="hv-field filtro-largo">
        <label htmlFor="bib-filtro" className="sr-only">Filtrar</label>
        <input id="bib-filtro" className="hv-input" type="search" placeholder="Filtrar pelo título ou texto" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </div>

      <Panel>
        {q.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {q.isError && <ErrorState onRetry={() => q.refetch()} />}
        {q.isSuccess && itens.length === 0 && <Empty title={filtro ? 'Nada encontrado.' : `Nenhum item em ${meta.plural.toLowerCase()} ainda.`}>Use “Incluir” para anexar o primeiro.</Empty>}
        {q.isSuccess && itens.length > 0 && (
          <ul className="seu-dia-lista">
            {itens.map((b) => (
              <li key={b.id} className="hv-row biblioteca-item">
                <span className="texto">
                  <span className="titulo">{b.titulo}</span>
                  <span className="sub">{[nomeArea(b.area), b.peca, b.arquivoNome ? `${b.arquivoNome}${b.tamanho ? ` · ${tamanhoTela(b.tamanho)}` : ''}` : null].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="biblioteca-acoes">
                  {b.tipo === 'modelo' && (b.conteudo?.trim() || /\.docx$/i.test(b.arquivoNome ?? '')) && <Button size="sm" variant="secondary" onClick={() => setUsando(b)} aria-label={`Usar o modelo ${b.titulo} com um cliente`}>Usar</Button>}
                  {b.arquivo && <Button size="sm" variant="ghost" onClick={() => abrirArquivo.mutate(b.arquivo!)} aria-label={`Abrir arquivo de ${b.titulo}`}>Abrir</Button>}
                  {b.link && <a className="hv-btn" data-variant="ghost" data-size="sm" href={b.link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir link de ${b.titulo}`}>Link</a>}
                  <Button size="sm" variant="ghost" onClick={() => editar(b)} aria-label={`Editar ${b.titulo}`}>Editar</Button>
                  {gestor && <Button size="sm" variant="ghost" onClick={() => setRetirando(b)} aria-label={`Retirar ${b.titulo}`}>Retirar</Button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {gestor && tipo === 'modelo' && <Pacotes />}
      <GerarDocumentoDialog aberto={!!usando} aoFechar={() => setUsando(null)} modelo={usando ?? undefined} />

      <Dialog open={!!aberto} onOpenChange={(v) => !v && setAberto(null)} title={aberto?.id ? 'Editar item' : 'Incluir na Biblioteca'}>
        <form className="hv-dialog-body catalogo-pilha" onSubmit={enviar} noValidate>
          <div className="ficha-campos">
            <div className="hv-field">
              <label htmlFor="bib-tipo">Tipo</label>
              <select id="bib-tipo" className="hv-input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoBiblioteca })}>
                {TIPOS_BIBLIOTECA.map((t) => <option key={t.tipo} value={t.tipo}>{t.rotulo}</option>)}
              </select>
            </div>
            <div className="hv-field">
              <label htmlFor="bib-area">Área</label>
              <select id="bib-area" className="hv-input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
                <option value="">Todas as áreas</option>
                {(areas.data ?? []).map((a) => <option key={a.area} value={a.area}>{a.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="hv-field">
            <label htmlFor="bib-titulo">Título</label>
            <input id="bib-titulo" className="hv-input" maxLength={200} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          {form.tipo === 'modelo' && (
            <div className="hv-field">
              <label htmlFor="bib-peca">Para qual documento</label>
              <input id="bib-peca" className="hv-input" list="bib-pecas" value={form.peca} onChange={(e) => setForm({ ...form, peca: e.target.value })} />
              <datalist id="bib-pecas">{PECAS.map((p) => <option key={p} value={p} />)}</datalist>
            </div>
          )}
          <div className="hv-field">
            <label htmlFor="bib-arquivo">Arquivo {aberto?.id ? '(envie outro para substituir)' : '(Word, PDF, ODT, RTF ou texto)'}</label>
            <input id="bib-arquivo" type="file" className="hv-input" accept={EXTENSOES_BIBLIOTECA.join(',')} onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </div>
          <div className="hv-field">
            <label htmlFor="bib-conteudo">{form.tipo === 'jurisprudencia' ? 'Ementa' : 'Texto'} (opcional se houver arquivo)</label>
            <textarea id="bib-conteudo" className="hv-input textarea" rows={5} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} />
          </div>
          {form.tipo === 'modelo' && (
            <details className="bib-variaveis">
              <summary>Variáveis para preencher sozinho (no texto ou no Word)</summary>
              <p className="hv-hint">Escreva a variável entre chaves duplas. Ao usar o modelo com um cliente, o HiAdv troca pelos dados dele.</p>
              <ul>{VARIAVEIS.map((v) => <li key={v.chave}><code>{`{{${v.chave}}}`}</code> {v.rotulo}</li>)}</ul>
            </details>
          )}
          <div className="hv-field">
            <label htmlFor="bib-link">Link (inteiro teor ou fonte)</label>
            <input id="bib-link" className="hv-input" inputMode="url" placeholder="https://" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </div>
          {erro && <p className="hv-error" role="alert">{erro}</p>}
          <div className="catalogo-linha">
            <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? 'Salvando…' : 'Salvar'}</Button>
            <Button variant="ghost" onClick={() => setAberto(null)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!retirando} onOpenChange={(v) => !v && setRetirando(null)} title="Retirar da Biblioteca">
        {retirando && (
          <div className="hv-dialog-body catalogo-pilha">
            <p><b>{retirando.titulo}</b> deixa de aparecer na Biblioteca e os agentes param de usá-lo. O registro fica guardado e pode ser restaurado pelo suporte.</p>
            <div className="catalogo-linha">
              <Button variant="danger" disabled={retirar.isPending} onClick={() => retirar.mutate(retirando.id)}>Retirar</Button>
              <Button variant="ghost" onClick={() => setRetirando(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
