import { useState } from 'react'
import { useApi, useSessao } from '../lib/contexto'
import { TABELAS_EXPORTACAO, leiaMe, nomeZip, paraCsv } from '../data/exportacao'
import { montarZip, type ArquivoZip } from '../lib/zip'
import { Button } from '../design/components/Button'

/** Gestor baixa todos os dados do escritório num ZIP com um CSV por tabela. */
export function ExportarDados() {
  const api = useApi(); const { perfil } = useSessao()
  const [andamento, setAndamento] = useState<{ feitas: number; atual: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState<string | null>(null)

  async function exportar() {
    setErro(null); setPronto(null)
    const arquivos: ArquivoZip[] = []; const contagem: Record<string, number> = {}
    try {
      for (let i = 0; i < TABELAS_EXPORTACAO.length; i++) {
        const t = TABELAS_EXPORTACAO[i]
        setAndamento({ feitas: i, atual: t.nome })
        const linhas: Record<string, unknown>[] = []
        for (let pagina = 0; pagina <= 500; pagina++) {
          const r = await api.exportarTabela(t.id, pagina)
          linhas.push(...r.linhas)
          if (r.linhas.length < r.tamanho) break
        }
        contagem[t.id] = linhas.length
        arquivos.push({ nome: `${t.nome}.csv`, conteudo: paraCsv(linhas) })
      }
      const escritorio = perfil?.escritorioNome ?? 'escritorio'
      arquivos.unshift({ nome: 'LEIA-ME.txt', conteudo: leiaMe(escritorio, contagem) })
      const zip = montarZip(arquivos)
      const nome = nomeZip(escritorio)
      const url = URL.createObjectURL(new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }))
      const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setPronto(`${nome} baixado, com ${Object.values(contagem).reduce((s, n) => s + n, 0)} linhas em ${TABELAS_EXPORTACAO.length} tabelas.`)
    } catch (e) {
      setErro((e as Error).message || 'Não foi possível exportar agora.')
    } finally { setAndamento(null) }
  }

  return (
    <div className="hv-panel-body cfg-exportar">
      <p className="muted">Baixa todos os dados do escritório num arquivo ZIP, com uma planilha (CSV) por assunto: clientes, casos, processos, prazos, financeiro, histórico e mais. Abre no Excel e no Google Planilhas. Senhas e chaves não saem, por segurança. Cada exportação fica registrada na auditoria.</p>
      {andamento && <p role="status">Preparando {andamento.atual}… ({andamento.feitas + 1} de {TABELAS_EXPORTACAO.length})</p>}
      {pronto && <p role="status" className="cfg-ok">{pronto}</p>}
      {erro && <p className="hv-error" role="alert">{erro}</p>}
      <Button loading={!!andamento} onClick={exportar}>Exportar todos os dados</Button>
    </div>
  )
}
