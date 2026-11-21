import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi, useSessao } from '../lib/contexto'
import { AGENTES_EM_BREVE, SERVICOS, faltasDoAgente, type Agente, type Integracao } from '../data/escritorio'
import { rotuloEtapa } from '../data/quadro'
import { Panel } from '../design/components/Panel'
import { Empty } from '../design/components/Empty'
import { ErrorState } from '../design/components/ErrorState'
import { Button } from '../design/components/Button'
import { Badge } from '../design/components/Badge'
import { Dialog } from '../design/components/Dialog'
import { useToast } from '../design/components/Toast'

const dataFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' })

function CartaoIntegracao({ i, aoMudar }: { i: Integracao; aoMudar: () => void }) {
  const api = useApi()
  const toast = useToast()
  const meta = SERVICOS[i.servico]
  const [chaveAberta, setChaveAberta] = useState(false)
  const [chave, setChave] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [limite, setLimite] = useState(i.limiteMensal != null ? String(i.limiteMensal).replace('.', ',') : '')

  const salvar = useMutation({
    mutationFn: (v: { ativo: boolean; modo?: string | null; limite?: number | null }) => api.salvarIntegracao(i.servico, v.ativo, v.modo, v.limite),
    onSuccess: (_d, v) => { toast(v.ativo ? `${meta.nome}: ativado.` : `${meta.nome}: desativado.`); aoMudar() },
    onError: (e) => toast(`Não foi possível: ${(e as Error).message}`, 'danger'),
  })
  const gravarChave = useMutation({
    mutationFn: () => api.salvarChave(i.servico, chave),
    onSuccess: (fim) => { toast(`Chave cadastrada (final ${fim}).`); setChave(''); setChaveAberta(false); aoMudar() },
    onError: (e) => setErro((e as Error).message),
  })
  const tirarChave = useMutation({
    mutationFn: () => api.removerChave(i.servico),
    onSuccess: () => { toast('Chave removida e integração desligada.'); aoMudar() },
    onError: (e) => toast(`Não foi possível: ${(e as Error).message}`, 'danger'),
  })
  const limiteNum = limite.trim() ? Number(limite.replace(/\./g, '').replace(',', '.')) : null

  return (
    <li className="integracao">
      <div className="integracao-topo">
        <div>
          <h3>{meta.nome}</h3>
          <p className="muted">{meta.descricao}</p>
        </div>
        <Badge tone={i.ativo ? 'success' : 'neutral'}>{i.ativo ? 'Ativo' : 'Desligado'}</Badge>
      </div>

      {meta.usaChave && (
        <p className="integracao-linha">
          {i.temChave ? <>Chave cadastrada (final <b>{i.chaveFinal}</b>){i.configuradoEm && ` em ${dataFmt.format(new Date(i.configuradoEm))}`}.</> : 'Nenhuma chave cadastrada.'}
          {' '}<Button size="sm" variant="ghost" onClick={() => { setErro(null); setChave(''); setChaveAberta(true) }}>{i.temChave ? 'Trocar chave' : 'Cadastrar chave'}</Button>
          {i.temChave && <Button size="sm" variant="ghost" disabled={tirarChave.isPending} onClick={() => tirarChave.mutate()}>Remover chave</Button>}
        </p>
      )}

      {i.servico === 'zapsign' && (
        <fieldset className="integracao-opcoes">
          <legend>Como enviar o kit</legend>
          <label className="alternar"><input type="radio" name="zap-modo" checked={(i.modo ?? 'um_clique') === 'um_clique'} onChange={() => salvar.mutate({ ativo: i.ativo, modo: 'um_clique' })} /> Com um clique (mostra a prévia antes)</label>
          <label className="alternar"><input type="radio" name="zap-modo" checked={i.modo === 'automatico'} onChange={() => salvar.mutate({ ativo: i.ativo, modo: 'automatico' })} /> Automático ao mover para “Aguardando assinatura”</label>
        </fieldset>
      )}

      {i.servico === 'claude' && (
        <div className="hv-field integracao-limite">
          <label htmlFor="claude-limite">Limite de gasto por mês (R$), opcional</label>
          <span className="catalogo-linha">
            <input id="claude-limite" className="hv-input" inputMode="decimal" placeholder="Sem limite" value={limite} onChange={(e) => setLimite(e.target.value)} />
            <Button size="sm" variant="secondary" disabled={limiteNum !== null && Number.isNaN(limiteNum)} onClick={() => salvar.mutate({ ativo: i.ativo, limite: limiteNum })}>Salvar limite</Button>
          </span>
          <span className="hv-hint">Ao chegar no limite, os agentes param até o mês seguinte.</span>
        </div>
      )}

      {i.servico === 'google_drive' && <p className="muted integracao-linha">A conexão com a pasta compartilhada chega na próxima etapa. Nada será lido sem a aprovação de um gestor.</p>}

      {i.servico !== 'google_drive' && (
        <div className="catalogo-linha">
          {i.ativo
            ? <Button variant="secondary" disabled={salvar.isPending} onClick={() => salvar.mutate({ ativo: false })}>Desligar</Button>
            : <Button disabled={salvar.isPending || (meta.usaChave && !i.temChave)} onClick={() => salvar.mutate({ ativo: true, limite: i.limiteMensal })}>Ativar</Button>}
          {meta.usaChave && !i.temChave && <span className="muted">Cadastre a chave para ativar.</span>}
        </div>
      )}

      <Dialog open={chaveAberta} onOpenChange={setChaveAberta} title={`Chave: ${meta.nome}`}>
        <form className="hv-dialog-body catalogo-pilha" onSubmit={(e: FormEvent) => { e.preventDefault(); setErro(null); gravarChave.mutate() }}>
          <p className="muted">A chave vai direto para o cofre do servidor. Depois de salva, ninguém consegue vê-la de novo pelo HiAdv, nem os gestores; aparece só o final.</p>
          <div className="hv-field">
            <label htmlFor="chave-campo">{meta.dicaChave}</label>
            <input id="chave-campo" className="hv-input" type="password" autoComplete="off" spellCheck={false} value={chave} onChange={(e) => setChave(e.target.value)} />
          </div>
          {erro && <p className="hv-error" role="alert">{erro}</p>}
          <div className="catalogo-linha">
            <Button type="submit" disabled={gravarChave.isPending || chave.trim().length < 20}>{gravarChave.isPending ? 'Salvando…' : 'Salvar chave'}</Button>
            <Button variant="ghost" onClick={() => setChaveAberta(false)}>Cancelar</Button>
          </div>
        </form>
      </Dialog>
    </li>
  )
}

function LinhaAgente({ a, integracoes, aoMudar }: { a: Agente; integracoes: Integracao[]; aoMudar: () => void }) {
  const api = useApi()
  const { perfil } = useSessao()
  const toast = useToast()
  const [aberto, setAberto] = useState(false)
  const [etapas, setEtapas] = useState<string[]>(a.etapas)
  const [modelo, setModelo] = useState<string | null>(a.modeloId)
  const [dias, setDias] = useState(String(a.parametros?.dias ?? 5))
  const emBreve = AGENTES_EM_BREVE.includes(a.agente)
  const [erro, setErro] = useState<string | null>(null)
  const etapasQ = useQuery({ queryKey: ['etapas-escritorio', perfil?.escritorioId], queryFn: () => api.etapasDoEscritorio(), enabled: aberto })
  const bib = useQuery({ queryKey: ['biblioteca', perfil?.escritorioId], queryFn: () => api.biblioteca(), enabled: aberto && a.usaModelo })
  const faltas = faltasDoAgente(a, integracoes, a.modeloId)
  const salvar = useMutation({
    mutationFn: (ativo: boolean) => api.configurarAgente(a.agente, ativo, etapas, modelo, a.agente === 'acompanhamento' ? { dias: Number(dias) } : {}),
    onSuccess: (_d, ativo) => { toast(ativo ? `${a.nome}: ligado.` : `${a.nome}: desligado.`); setAberto(false); aoMudar() },
    onError: (e) => { setErro((e as Error).message); toast(`Não foi possível: ${(e as Error).message}`, 'danger') },
  })
  const porArea = (etapasQ.data ?? []).reduce<Record<string, { nome: string; itens: string[] }>>((m, e) => {
    (m[e.area] ??= { nome: e.areaNome, itens: [] }).itens.push(e.status); return m
  }, {})

  return (
    <li className="agente">
      <div className="agente-topo">
        <div>
          <h3>{a.nome} {a.semCusto && !emBreve && <span className="agente-selo">Sem custo · funciona sem chave</span>}{emBreve && <span className="agente-selo agente-selo-breve">Em breve</span>}</h3>
          <p className="muted">{a.descricao}</p>
          {a.ativo && a.etapas.length > 0 && <p className="agente-quando">Entra quando o caso vai para: {a.etapas.map(rotuloEtapa).join(', ')}</p>}
          {a.ativo && a.modeloTitulo && <p className="agente-quando">Modelo: {a.modeloTitulo}</p>}
          {a.ativo && a.agente === 'acompanhamento' && <p className="agente-quando">Retorno em {String(a.parametros?.dias ?? 5)} dias úteis</p>}
          {!a.ativo && !emBreve && faltas.length > 0 && <p className="agente-falta">Para ligar: {faltas.join(' · ')}</p>}
        </div>
        <span className="agente-acoes">
          <Badge tone={a.ativo ? 'success' : 'neutral'}>{a.ativo ? 'Ligado' : 'Desligado'}</Badge>
          {!emBreve && <Button size="sm" variant="ghost" onClick={() => { setEtapas(a.etapas); setModelo(a.modeloId); setDias(String(a.parametros?.dias ?? 5)); setErro(null); setAberto(true) }} aria-label={`Configurar ${a.nome}`}>Configurar</Button>}
        </span>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto} title={`Configurar: ${a.nome}`}>
        <div className="hv-dialog-body catalogo-pilha">
          <fieldset className="integracao-opcoes">
            <legend>Quando entra em ação</legend>
            <p className="muted">Escolha as etapas. Quando um caso for movido para uma delas, o agente trabalha e entrega o resultado para revisão.</p>
            {etapasQ.isLoading && <p className="muted">Carregando etapas…</p>}
            {Object.entries(porArea).map(([area, g]) => (
              <div key={area} className="agente-etapas">
                <b>{g.nome}</b>
                {g.itens.map((st) => (
                  <label key={st} className="alternar">
                    <input type="checkbox" checked={etapas.includes(st)} onChange={(e) => setEtapas(e.target.checked ? [...etapas, st] : etapas.filter((x) => x !== st))} /> {rotuloEtapa(st)}
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
          {a.usaModelo && (
            <div className="hv-field">
              <label htmlFor={`mod-${a.agente}`}>Modelo da Biblioteca</label>
              <select id={`mod-${a.agente}`} className="hv-input" value={modelo ?? ''} onChange={(e) => setModelo(e.target.value || null)}>
                <option value="">Escolha um modelo</option>
                {(bib.data ?? []).filter((b) => b.tipo === 'modelo').map((b) => <option key={b.id} value={b.id}>{b.titulo}</option>)}
              </select>
              {bib.isSuccess && !bib.data.some((b) => b.tipo === 'modelo') && <span className="hv-hint">Inclua um modelo na Biblioteca primeiro.</span>}
            </div>
          )}
          {a.agente === 'acompanhamento' && (
            <div className="hv-field integracao-limite">
              <label htmlFor="acomp-dias">Retorno em quantos dias úteis</label>
              <input id="acomp-dias" className="hv-input" type="number" min={1} max={60} value={dias} onChange={(e) => setDias(e.target.value)} />
            </div>
          )}
          {erro && <p className="hv-error" role="alert">{erro}</p>}
          <div className="catalogo-linha">
            <Button disabled={salvar.isPending} onClick={() => salvar.mutate(true)}>Salvar e ligar</Button>
            {a.ativo && <Button variant="secondary" disabled={salvar.isPending} onClick={() => salvar.mutate(false)}>Desligar</Button>}
            <Button variant="ghost" onClick={() => setAberto(false)}>Cancelar</Button>
          </div>
        </div>
      </Dialog>
    </li>
  )
}

export function Configuracoes() {
  const api = useApi()
  const { perfil } = useSessao()
  const qc = useQueryClient()
  const gestor = perfil?.papel === 'master' || perfil?.papel === 'code'
  const integ = useQuery({ queryKey: ['integracoes', perfil?.escritorioId], queryFn: () => api.integracoes(), enabled: !!perfil && gestor })
  const ag = useQuery({ queryKey: ['agentes', perfil?.escritorioId], queryFn: () => api.agentes(), enabled: !!perfil && gestor })
  const atualizar = () => { qc.invalidateQueries({ queryKey: ['integracoes'] }); qc.invalidateQueries({ queryKey: ['agentes'] }) }

  if (perfil && !gestor) return <div className="pagina"><Panel><Empty title="Só o Gestor Master acessa as configurações do escritório." /></Panel></div>

  return (
    <div className="pagina">
      <div className="pagina-cabeca"><div><h1>Configurações</h1><p className="muted">{perfil?.escritorioNome}. Cada escritório tem as suas chaves, os seus custos e os seus agentes.</p></div></div>

      <Panel title="Integrações" labelId="cfg-integ">
        {integ.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {integ.isError && <ErrorState onRetry={() => integ.refetch()} />}
        {integ.isSuccess && integ.data.length === 0 && <Empty title="As integrações ainda não foram ativadas no servidor." />}
        {integ.isSuccess && integ.data.length > 0 && <ul className="integracoes">{integ.data.map((i) => <CartaoIntegracao key={i.servico} i={i} aoMudar={atualizar} />)}</ul>}
      </Panel>

      <Panel title="Agentes" labelId="cfg-agentes">
        <p className="hv-panel-body muted">Os agentes preparam; quem decide e assina é o advogado. Tudo o que fazem fica no histórico do caso. Os marcados “Sem custo” funcionam por regras, sem IA, e podem ser ligados já.</p>
        {ag.isLoading && <p className="hv-panel-body muted" role="status">Carregando…</p>}
        {ag.isError && <ErrorState onRetry={() => ag.refetch()} />}
        {ag.isSuccess && ag.data.length === 0 && <Empty title="Os agentes ainda não foram ativados no servidor." />}
        {ag.isSuccess && ag.data.length > 0 && <ul className="agentes">{ag.data.map((a) => <LinhaAgente key={a.agente} a={a} integracoes={integ.data ?? []} aoMudar={atualizar} />)}</ul>}
      </Panel>
    </div>
  )
}
