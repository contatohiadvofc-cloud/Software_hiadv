import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/contexto'
import { ordenarMembros, podeNoGrupo, type MembroGrupo, type PessoaEquipe } from '../data/conversas'
import { Dialog } from '../design/components/Dialog'
import { Button } from '../design/components/Button'
import { Carregando } from '../design/components/Carregando'
import { useToast } from '../design/components/Toast'

const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

/** Dados do grupo como no WhatsApp: nome e descrição, regras, participantes com admins e sair do grupo. */
export function GrupoPainel({ conversa, eu, nomes, pessoas, aberto, aoFechar, conversarCom, aoSair }: {
  conversa: string; eu: string; nomes: Map<string, string>; pessoas: PessoaEquipe[]; aberto: boolean; aoFechar: () => void
  conversarCom: (email: string) => void; aoSair: () => void
}) {
  const api = useApi(); const qc = useQueryClient(); const toast = useToast()
  const q = useQuery({ queryKey: ['grupo', conversa], queryFn: () => api.grupoInfo(conversa), enabled: aberto })
  const [editando, setEditando] = useState<{ titulo: string; descricao: string } | null>(null)
  const [adicionar, setAdicionar] = useState<string[] | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<{ texto: string; fazer: () => void } | null>(null)
  const nome = (e: string) => (e === eu ? 'Você' : nomes.get(e) ?? e)
  const recarregar = () => { qc.invalidateQueries({ queryKey: ['grupo', conversa] }); qc.invalidateQueries({ queryKey: ['chat-lista'] }); qc.invalidateQueries({ queryKey: ['chat-msgs', conversa] }) }
  const acao = useMutation({ mutationFn: (f: () => Promise<void>) => f(), onSuccess: () => { recarregar(); setMenu(null); setConfirmar(null) }, onError: (e) => toast((e as Error).message, 'danger') })
  const g = q.data
  const pode = g ? podeNoGrupo(g) : null
  const fora = pessoas.filter((p) => !g?.membros.some((m) => m.email === p.email))

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) aoFechar() }} title="Dados do grupo" variant="painel">
      {q.isLoading && <Carregando avatar />}
      {q.isError && <p className="muted">Não deu para abrir os dados do grupo.</p>}
      {g && pode && (
        <div className="gp">
          <header className="gp-topo">
            <span className="gp-avatar" aria-hidden="true">{iniciais(g.titulo)}</span>
            {editando ? (
              <form className="gp-editar" onSubmit={(e) => { e.preventDefault(); acao.mutate(async () => { await api.grupoEditar(conversa, editando.titulo, editando.descricao); setEditando(null) }) }}>
                <label className="adm-campo"><span>Nome do grupo</span><input className="hv-input" maxLength={80} value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} autoFocus /></label>
                <label className="adm-campo"><span>Descrição</span><textarea className="hv-input" rows={3} maxLength={500} value={editando.descricao} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} placeholder="Do que trata o grupo" /></label>
                <div className="rh-acoes"><Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button><Button type="submit" loading={acao.isPending}>Salvar</Button></div>
              </form>
            ) : (
              <>
                <h3>{g.titulo}</h3>
                <p className="muted">Grupo · {g.membros.length} {g.membros.length === 1 ? 'participante' : 'participantes'}</p>
                <p className="gp-desc">{g.descricao || <span className="muted">Sem descrição</span>}</p>
                {pode.editarDados && <Button variant="secondary" size="sm" onClick={() => setEditando({ titulo: g.titulo, descricao: g.descricao ?? '' })}>Editar nome e descrição</Button>}
              </>
            )}
          </header>

          {pode.gerenciar && (
            <section className="gp-sec" aria-labelledby="gp-regras">
              <h4 id="gp-regras">Configurações do grupo</h4>
              <label className="gp-regra"><span><b>Enviar mensagens</b><small>{g.soAdminsEnviam ? 'Só administradores' : 'Todos os participantes'}</small></span>
                <input type="checkbox" role="switch" aria-label="Só administradores enviam mensagens" checked={g.soAdminsEnviam} onChange={(e) => acao.mutate(() => api.grupoRegras(conversa, { soAdminsEnviam: e.target.checked }))} /></label>
              <label className="gp-regra"><span><b>Editar dados do grupo</b><small>{g.soAdminsEditam ? 'Só administradores' : 'Todos os participantes'}</small></span>
                <input type="checkbox" role="switch" aria-label="Só administradores editam os dados do grupo" checked={g.soAdminsEditam} onChange={(e) => acao.mutate(() => api.grupoRegras(conversa, { soAdminsEditam: e.target.checked }))} /></label>
            </section>
          )}

          <section className="gp-sec" aria-labelledby="gp-part">
            <h4 id="gp-part">{g.membros.length} participantes</h4>
            {pode.gerenciar && (adicionar === null
              ? <button type="button" className="gp-linha gp-add" onClick={() => setAdicionar([])} disabled={!fora.length}><span className="gp-av gp-av-add" aria-hidden="true">+</span><span>{fora.length ? 'Adicionar participantes' : 'Toda a equipe já está no grupo'}</span></button>
              : (
                <div className="gp-escolher">
                  {fora.map((p) => (
                    <label key={p.email} className="gp-linha"><input type="checkbox" checked={adicionar.includes(p.email)} onChange={(e) => setAdicionar(e.target.checked ? [...adicionar, p.email] : adicionar.filter((x) => x !== p.email))} />
                      <span className="gp-av" aria-hidden="true">{iniciais(p.nome)}</span><span>{p.nome}</span></label>
                  ))}
                  <div className="rh-acoes"><Button variant="secondary" size="sm" onClick={() => setAdicionar(null)}>Cancelar</Button>
                    <Button size="sm" disabled={!adicionar.length} loading={acao.isPending} onClick={() => acao.mutate(async () => { await api.grupoAdicionar(conversa, adicionar); setAdicionar(null) })}>Adicionar {adicionar.length || ''}</Button></div>
                </div>
              ))}
            <ul className="gp-lista">
              {ordenarMembros(g.membros, eu).map((m: MembroGrupo) => (
                <li key={m.email}>
                  <button type="button" className="gp-linha" aria-expanded={menu === m.email} disabled={m.email === eu} onClick={() => setMenu(menu === m.email ? null : m.email)}>
                    <span className="gp-av" aria-hidden="true">{iniciais(nomes.get(m.email) ?? m.email)}</span>
                    <span className="gp-nome">{nome(m.email)}</span>
                    {m.admin && <span className="gp-admin">Admin do grupo</span>}
                  </button>
                  {menu === m.email && (
                    <div className="gp-menu" role="menu" aria-label={`Opções para ${nome(m.email)}`}>
                      <button type="button" role="menuitem" onClick={() => { conversarCom(m.email); aoFechar() }}>Conversar com {nome(m.email).split(' ')[0]}</button>
                      {pode.gerenciar && <button type="button" role="menuitem" onClick={() => acao.mutate(() => api.grupoAdmin(conversa, m.email, !m.admin))}>{m.admin ? 'Remover como admin' : 'Tornar admin do grupo'}</button>}
                      {pode.gerenciar && <button type="button" role="menuitem" className="cv-perigo" onClick={() => setConfirmar({ texto: `Remover ${nome(m.email)} do grupo?`, fazer: () => acao.mutate(() => api.grupoRemover(conversa, m.email)) })}>Remover do grupo</button>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="gp-sec">
            <button type="button" className="gp-linha gp-sair" onClick={() => setConfirmar({ texto: `Sair do grupo "${g.titulo}"? Você deixa de ver as mensagens.`, fazer: () => acao.mutate(async () => { await api.grupoSair(conversa); aoSair() }) })}>Sair do grupo</button>
          </section>

          {confirmar && (
            <div className="rh-confirma gp-confirma" role="alertdialog" aria-label="Confirmar">
              <span>{confirmar.texto}</span>
              <Button variant="secondary" size="sm" onClick={() => setConfirmar(null)}>Cancelar</Button>
              <Button variant="danger" size="sm" loading={acao.isPending} onClick={confirmar.fazer}>Confirmar</Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  )
}
