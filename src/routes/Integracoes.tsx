import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { CATEGORIAS, CONECTORES, ESTADO_ROTULO, filtrarConectores, type Categoria, type Conector } from '../data/conectores'
import { Badge } from '../design/components/Badge'
import { Dialog } from '../design/components/Dialog'
import { CartaoIntegracao } from './Configuracoes'
import { RECURSO_DO_CONECTOR, planoMinimo } from '../data/planos'
import { plano as dadosPlano } from '../data/adesao'

const planoDe = (id: string) => { const p = planoMinimo(RECURSO_DO_CONECTOR[id] ?? ''); return p ? dadosPlano(p).nome : null }

function Detalhe({ c, gestor }: { c: Conector; gestor: boolean }) {
  const api = useApi()
  const { perfil } = useSessao()
  const qc = useQueryClient()
  const integ = useQuery({ queryKey: ['integracoes', perfil?.escritorioId], queryFn: () => api.integracoes(), enabled: !!c.servico && gestor })
  const atual = integ.data?.find((i) => i.servico === c.servico)
  return (
    <div className="hv-dialog-body conector-detalhe">
      <p>{c.resumo}</p>
      <h3>O que passa a funcionar no HiAdv</h3>
      <ul>{c.servicos.map((s) => <li key={s}>{s}</li>)}</ul>
      <h3>Como conectar</h3>
      <ol>{c.comoConectar.map((s) => <li key={s}>{s}</li>)}</ol>
      {planoDe(c.id) && <p className="conector-plano">Incluído a partir do plano <b>{planoDe(c.id)}</b>.</p>}
      <p className="conector-resp"><b>Quem responde pelo dado:</b> {c.responsavel}</p>
      {c.site && <p><a href={c.site} target="_blank" rel="noopener noreferrer">Site de {c.nome}</a></p>}
      {c.estado === 'sob_contrato' && <p className="muted">Depende de contrato e liberação da API pela empresa. Quando o escritório tiver o acesso, avise a equipe HiAdv para ligarmos.</p>}
      {c.leituraPendente && <p className="muted">Já dá para guardar a chave com segurança. A leitura automática por esta ferramenta entra numa próxima atualização, e o cartão avisa quando estiver funcionando.</p>}
      {c.estado === 'em_breve' && <p className="muted">Em breve. Quando a conexão abrir, o gestor cadastra o acesso aqui; nenhuma chave é pedida por mensagem.</p>}
      {c.servico && !gestor && <p className="muted">Só os gestores conectam ferramentas.</p>}
      {c.servico && gestor && atual && <ul className="integracoes"><CartaoIntegracao i={atual} aoMudar={() => qc.invalidateQueries({ queryKey: ['integracoes'] })} /></ul>}
    </div>
  )
}

export function Integracoes() {
  const { perfil } = useSessao()
  const gestor = perfil?.papel === 'master' || !!perfil?.code
  const api = useApi()
  const integ = useQuery({ queryKey: ['integracoes', perfil?.escritorioId], queryFn: () => api.integracoes(), enabled: !!perfil && gestor })
  const [busca, setBusca] = useState('')
  const [cat, setCat] = useState<Categoria | 'todas'>('todas')
  const [aberto, setAberto] = useState<Conector | null>(null)
  const lista = filtrarConectores(CONECTORES, busca, cat)
  const ligado = (c: Conector) => !!c.servico && !!integ.data?.find((i) => i.servico === c.servico && i.ativo)

  return (
    <div className="pagina conectores">
      <div className="pagina-cabeca"><div><h1>Integrações</h1><p className="muted">Conecte as ferramentas que o escritório já contrata e use tudo dentro do HiAdv.</p></div></div>
      <p className="conectores-aviso" role="note">
        Intimações, publicações e andamentos vêm da ferramenta conectada, que responde pela captura. O HiAdv organiza, calcula o prazo e cria a tarefa. O controle oficial continua sendo o painel do tribunal.
      </p>
      <div className="conectores-filtros">
        <input className="hv-input" type="search" aria-label="Buscar integração" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="conectores-chips" role="group" aria-label="Categoria">
          {[{ id: 'todas' as const, nome: 'Todas' }, ...CATEGORIAS].map((k) => (
            <button key={k.id} type="button" className="conectores-chip" aria-pressed={cat === k.id} onClick={() => setCat(k.id)}>{k.nome}</button>
          ))}
        </div>
      </div>
      {lista.length === 0 && <p className="muted">Nenhuma integração com esse nome.</p>}
      <ul className="conectores-grade">
        {lista.map((c) => (
          <li key={c.id}>
            <button type="button" className="conector" onClick={() => setAberto(c)}>
              <span className="conector-icone" aria-hidden="true">{c.nome.slice(0, 1)}</span>
              <span className="conector-texto">
                <b>{c.nome}</b>
                <span className="muted">{c.resumo}</span>
                {planoDe(c.id) && <small className="conector-plano-selo">Plano {planoDe(c.id)}</small>}
              </span>
              <Badge tone={ligado(c) ? 'success' : c.estado === 'em_breve' ? 'neutral' : 'info'}>{ligado(c) ? 'Conectado' : ESTADO_ROTULO[c.estado]}</Badge>
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={!!aberto} onOpenChange={(v) => { if (!v) setAberto(null) }} title={aberto?.nome ?? ''} variant="painel">
        {aberto && <Detalhe c={aberto} gestor={gestor} />}
      </Dialog>
    </div>
  )
}
