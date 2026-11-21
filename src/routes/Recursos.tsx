import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { NOMES_GRUPO, recursosVisiveis, type Grupo, type Recurso } from '../data/recursos'
import { Badge } from '../design/components/Badge'

function Onde({ r }: { r: Recurso }) {
  if (!r.onde) return null
  const igual = r.onde.rotulo === r.nome
  const texto = igual ? 'Abrir' : r.onde.rotulo
  const rotulo = igual ? `Abrir ${r.nome}` : undefined
  if (r.onde.to === '/configuracoes' && r.onde.hash) return <a className="recurso-onde" href={`#${r.onde.hash}`} aria-label={rotulo}>{texto}</a>
  return <Link className="recurso-onde" to={r.onde.to} hash={r.onde.hash} aria-label={rotulo}>{texto}</Link>
}

/** O que o HiAdv faz, o que falta ativar e como. Uma linha por recurso; o passo a passo abre ao tocar. */
export function RecursosDoHiAdv() {
  const api = useApi()
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || perfil?.papel === 'code'
  const integ = useQuery({ queryKey: ['integracoes', perfil?.escritorioId], queryFn: () => api.integracoes(), enabled: !!perfil && gestor })
  const oabs = useQuery({ queryKey: ['oabs', perfil?.escritorioId], queryFn: () => api.oabs(), enabled: !!perfil && gestor })
  const contato = useQuery({ queryKey: ['contato', perfil?.escritorioId], queryFn: () => api.contatoEscritorio(), enabled: !!perfil && gestor })
  const grupos = recursosVisiveis(gestor)

  const ativo = (id: string) => integ.data?.find((i) => i.servico === (id === 'ia' ? 'claude' : id))?.ativo === true
  /** Pendência que o gestor resolve em um minuto, mostrada só quando existe. */
  function pendencia(r: Recurso): { texto: string; hash: string } | null {
    if (!gestor) return null
    if (r.id === 'publicacoes' && oabs.isSuccess && oabs.data.oabs.length === 0 && oabs.data.daEquipe.length === 0) return { texto: 'Cadastre a OAB para começar', hash: 'oabs' }
    if (r.id === 'acompanhamento' && contato.isSuccess && !contato.data.whatsapp) return { texto: 'Falta o WhatsApp do escritório', hash: 'contato' }
    return null
  }

  const pendencias = grupos.ligado.map((r) => ({ r, p: pendencia(r) })).filter((x) => x.p)
  const lista = (g: Grupo) => g === 'ligado' ? (
    <ul className="recursos-lista">
      {grupos.ligado.map((r) => (
        <li key={r.id} className="recurso">
          <div className="recurso-texto"><strong>{r.nome}</strong><span className="muted">{r.resumo}</span></div>
          <Onde r={r} />
        </li>
      ))}
    </ul>
  ) : (
    <ul className="recursos-lista">
      {grupos[g].map((r) => (
        <li key={r.id} className="recurso recurso-aberto">
          <details>
            <summary>
              <span className="recurso-texto"><strong>{r.nome}</strong><span className="muted">{r.resumo}</span></span>
              {g === 'ativar' && <Badge tone={ativo(r.id) ? 'success' : 'neutral'}>{ativo(r.id) ? 'Ativo' : 'Desligado'}</Badge>}
            </summary>
            <div className="recurso-passos">
              {r.passos && (g === 'ativar' ? <ol>{r.passos.map((x) => <li key={x}>{x}</li>)}</ol> : <ul>{r.passos.map((x) => <li key={x}>{x}</li>)}</ul>)}
              {r.custo && <p className="hv-hint">Custo: {r.custo}</p>}
              {r.onde && <Onde r={r} />}
            </div>
          </details>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="recursos">
      {pendencias.length > 0 && (
        <ul className="recursos-pendencias" aria-label="Falta configurar">
          {pendencias.map(({ r, p }) => <li key={r.id}><span>{r.nome}:</span> <a className="recurso-pendente" href={`#${p!.hash}`}>{p!.texto}</a></li>)}
        </ul>
      )}
      <details className="recursos-grupo recursos-ligado">
        <summary className="recursos-titulo">{NOMES_GRUPO.ligado} <span className="muted">{grupos.ligado.length} recursos, sem custo</span></summary>
        {lista('ligado')}
      </details>
      {(['ativar', 'preparo'] as Grupo[]).map((g) => grupos[g].length > 0 && (
        <section key={g} className="recursos-grupo" aria-labelledby={`rec-${g}`}>
          <h3 id={`rec-${g}`} className="recursos-titulo">{NOMES_GRUPO[g]} <span className="muted">{grupos[g].length}</span></h3>
          {lista(g)}
        </section>
      ))}
    </div>
  )
}
