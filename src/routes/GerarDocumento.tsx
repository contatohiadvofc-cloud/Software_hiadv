import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { mapaDeValores, nomeArquivo, preencher } from '../data/modelos'
import type { ItemBiblioteca } from '../data/escritorio'
import { nomeDaArea } from '../data/areas'
import { diaSP } from '../data/seuDia'
import { Dialog } from '../design/components/Dialog'
import { Button } from '../design/components/Button'
import { useToast } from '../design/components/Toast'
import { EscolherCliente } from './EscolherCliente'

const ehDocx = (m: ItemBiblioteca) => !!m.arquivo && /\.docx$/i.test(m.arquivoNome ?? m.arquivo)
const usavel = (m: ItemBiblioteca) => m.tipo === 'modelo' && (!!m.conteudo?.trim() || ehDocx(m))

/** Gera o documento de um modelo com os dados do cliente (e do caso). Tudo acontece no aparelho; o advogado revisa antes de usar. */
export function GerarDocumentoDialog({ aberto, aoFechar, modelo: modeloInicial, cliente: clienteInicial }: {
  aberto: boolean; aoFechar: () => void; modelo?: ItemBiblioteca; cliente?: { id: string; nome: string }
}) {
  const api = useApi()
  const toast = useToast()
  const { perfil } = useSessao()
  const [modeloId, setModeloId] = useState('')
  const [cli, setCli] = useState<{ id: string; nome: string } | null>(null)
  const [casoId, setCasoId] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => { if (aberto) { setModeloId(modeloInicial?.id ?? ''); setCli(clienteInicial ?? null); setCasoId(''); setErro(null) } }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  const bib = useQuery({ queryKey: ['biblioteca', perfil?.escritorioId], queryFn: () => api.biblioteca(), enabled: aberto && !modeloInicial })
  const modelos = (bib.data ?? []).filter(usavel)
  const modelo = modeloInicial ?? modelos.find((m) => m.id === modeloId)
  const ficha = useQuery({ queryKey: ['cliente', perfil?.escritorioId, cli?.id], queryFn: () => api.cliente(cli!.id), enabled: aberto && !!cli })
  const dados = useQuery({ queryKey: ['documento-dados', perfil?.escritorioId, cli?.id, casoId], queryFn: () => api.documentoDados(cli!.id, casoId || null), enabled: aberto && !!cli })
  const hoje = diaSP(new Date())
  const valores = useMemo(() => (dados.data ? mapaDeValores(dados.data, hoje) : null), [dados.data, hoje])
  const previa = modelo?.conteudo?.trim() && valores ? preencher(modelo.conteudo, valores) : null

  const gerar = useMutation({
    mutationFn: async () => {
      const { docxDeModelo, docxDeTexto, baixar } = await import('../lib/docx')
      const nome = nomeArquivo(modelo!.titulo, cli!.nome, hoje)
      if (ehDocx(modelo!)) {
        const r = await docxDeModelo(await api.arquivoBiblioteca(modelo!.arquivo!), valores!)
        baixar(r.blob, nome); return r.faltando
      }
      baixar(await docxDeTexto(previa!.texto), nome); return previa!.faltando
    },
    onSuccess: (faltando) => toast(faltando.length ? `Documento gerado. Complete: ${faltando.join(', ')}.` : 'Documento gerado. Revise antes de usar.'),
    onError: (e) => setErro((e as Error).message),
  })
  async function copiar() {
    try { await navigator.clipboard.writeText(previa!.texto); toast('Texto copiado.') } catch { setErro('Não foi possível copiar. Selecione o texto e copie.') }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o) aoFechar() }} title="Gerar documento">
      <div className="hv-dialog-body ficha-form">
        {modeloInicial ? <p className="cad-escolhido"><span>Modelo: <strong>{modeloInicial.titulo}</strong></span></p> : (
          <div className="hv-field">
            <label htmlFor="gd-modelo">Modelo</label>
            <select id="gd-modelo" className="hv-input" value={modeloId} onChange={(e) => setModeloId(e.target.value)}>
              <option value="">Escolha o modelo</option>
              {modelos.map((m) => <option key={m.id} value={m.id}>{m.titulo}{ehDocx(m) ? ' (Word)' : ''}</option>)}
            </select>
            {bib.isSuccess && modelos.length === 0 && <span className="hv-hint">Nenhum modelo com texto ou em Word (.docx) na <Link to="/biblioteca">Biblioteca</Link>.</span>}
          </div>
        )}
        {clienteInicial ? <p className="cad-escolhido"><span>Cliente: <strong>{clienteInicial.nome}</strong></span></p> : <EscolherCliente valor={cli} aoEscolher={setCli} />}
        {cli && (ficha.data?.casos.length ?? 0) > 0 && (
          <div className="hv-field">
            <label htmlFor="gd-caso">Caso (para os dados do caso)</label>
            <select id="gd-caso" className="hv-input" value={casoId} onChange={(e) => setCasoId(e.target.value)}>
              <option value="">Sem caso</option>
              {ficha.data!.casos.map((k) => <option key={k.id} value={k.id}>{nomeDaArea(k.area)} · {k.status}</option>)}
            </select>
          </div>
        )}
        {previa && (
          <>
            {previa.faltando.length > 0 && (
              <p className="hv-hint">Faltam: {previa.faltando.join(', ')}. Ficam marcados como [PREENCHER] no documento. Complete na página do cliente, em “Dados para documentos”.</p>
            )}
            <div className="gd-previa" tabIndex={0} aria-label="Prévia do documento">{previa.texto}</div>
          </>
        )}
        {modelo && ehDocx(modelo) && cli && <p className="hv-hint">O modelo em Word é preenchido mantendo a formatação. Use as variáveis entre chaves duplas no arquivo, por exemplo {'{{cliente.nome}}'}.</p>}
        {erro && <p className="hv-error" role="alert">{erro}</p>}
        <div className="catalogo-linha">
          <Button disabled={!modelo || !cli || !valores} loading={gerar.isPending} onClick={() => { setErro(null); gerar.mutate() }}>Baixar Word (.docx)</Button>
          {previa && <Button variant="secondary" onClick={copiar}>Copiar texto</Button>}
          <Button variant="ghost" onClick={aoFechar}>Fechar</Button>
        </div>
      </div>
    </Dialog>
  )
}
