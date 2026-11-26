import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { CAMINHO, dataLonga, diasAte, horaCurta, linkWhats, pontoNoCaminho, quandoFoi, type MpApi, type MpCaso, type MpInicio, type MpMensagem } from './dados'

type Tela = 'inicio' | 'conversa'
type InstalarEvento = Event & { prompt: () => Promise<void> }

function Caminho({ caso }: { caso: MpCaso }) {
  const { indice, precisaDeVoce } = pontoNoCaminho(caso.fase, caso.concluido)
  return (
    <section className="mp-caso" aria-labelledby={`caso-${caso.area}`}>
      <p className="mp-rotulo" id={`caso-${caso.area}`}>{caso.area}</p>
      <h2 className="mp-fase">{caso.fase}</h2>
      {precisaDeVoce && <p className="mp-precisa">Esta etapa depende de você. Veja abaixo o que falta.</p>}
      <ol className="mp-caminho" aria-label="Etapas do seu caso">
        {CAMINHO.map((nome, i) => (
          <li key={nome} data-estado={i < indice ? 'feito' : i === indice ? 'agora' : 'depois'} aria-current={i === indice ? 'step' : undefined}>
            <span className="mp-ponto" aria-hidden="true" />
            <span className="mp-etapa">{nome}{i === indice && <small>você está aqui</small>}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Compromissos({ d }: { d: MpInicio }) {
  if (!d.compromissos.length) return null
  return (
    <section className="mp-bloco" aria-labelledby="t-comp">
      <h2 className="mp-titulo" id="t-comp">Próximo compromisso</h2>
      {d.compromissos.slice(0, 3).map((c) => {
        const n = diasAte(c.quando)
        return (
          <article key={c.tipo + c.quando} className="mp-compromisso" data-perto={n <= 3 || undefined}>
            <div className="mp-dia" aria-hidden="true">
              <b>{new Date(c.quando).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit' })}</b>
              <span>{new Date(c.quando).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', month: 'short' }).replace('.', '')}</span>
            </div>
            <div>
              <p className="mp-comp-tipo">{c.tipo} {n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n > 1 ? `em ${n} dias` : ''}</p>
              <p className="mp-comp-quando">{dataLonga(c.quando)}, às {horaCurta(c.quando)}</p>
              {c.local && <p className="mp-comp-local">{c.local}</p>}
            </div>
          </article>
        )
      })}
    </section>
  )
}

function Novidades({ d, novas }: { d: MpInicio; novas: Set<string> }) {
  const [aberta, setAberta] = useState<string | null>(null)
  return (
    <section className="mp-bloco" aria-labelledby="t-nov">
      <h2 className="mp-titulo" id="t-nov">Novidades{novas.size > 0 && <span className="mp-n">{novas.size} {novas.size === 1 ? 'nova' : 'novas'}</span>}</h2>
      {!d.atualizacoes.length ? (
        <p className="mp-vazio">Ainda não há novidades. Quando o seu caso andar, a equipe do escritório explica aqui, em palavras simples.</p>
      ) : (
        <ul className="mp-novidades">
          {d.atualizacoes.map((a, i) => {
            const longa = a.texto.length > 160
            const mostrar = !longa || aberta === a.id || i === 0
            return (
              <li key={a.id} className="mp-novidade" data-nova={novas.has(a.id) || undefined}>
                <p className="mp-nov-quando">{novas.has(a.id) && <span className="mp-selo">Nova</span>}{quandoFoi(a.em)}</p>
                <h3>{a.titulo}</h3>
                <p className="mp-nov-texto">{mostrar ? a.texto : a.texto.slice(0, 150).trimEnd() + '…'}</p>
                {longa && i !== 0 && <button type="button" className="mp-link" aria-expanded={mostrar} onClick={() => setAberta(mostrar ? null : a.id)}>{mostrar ? 'Mostrar menos' : 'Ler tudo'}</button>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Pendencias({ d, aoConversar }: { d: MpInicio; aoConversar: () => void }) {
  if (!d.pendencias.length) return null
  return (
    <section className="mp-bloco" aria-labelledby="t-pen">
      <h2 className="mp-titulo" id="t-pen">Documentos que faltam</h2>
      <ul className="mp-pendencias">
        {d.pendencias.map((p) => (
          <li key={p.id} data-status={p.status}>
            <p className="mp-pen-nome">{p.titulo}</p>
            {p.detalhe && <p className="mp-pen-det">{p.detalhe}</p>}
            {p.status === 'reenviar' && p.motivo && <p className="mp-pen-motivo">Precisa enviar de novo: {p.motivo}</p>}
            <p className="mp-pen-sit">{p.status === 'enviada' ? 'Recebido. A equipe está conferindo.' : 'Ainda não recebemos.'}</p>
          </li>
        ))}
      </ul>
      <button type="button" className="mp-btn mp-btn-contorno" onClick={aoConversar}>Tenho uma dúvida sobre os documentos</button>
    </section>
  )
}

function Conversa({ api, escritorio, aoLer }: { api: MpApi; escritorio: string; aoLer: () => void }) {
  const [msgs, setMsgs] = useState<MpMensagem[] | null>(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const fim = useRef<HTMLDivElement>(null)
  const carregar = useCallback(async () => { try { setMsgs(await api.mensagens()); aoLer() } catch (e) { setErro((e as Error).message) } }, [api, aoLer])
  useEffect(() => { void carregar(); const t = setInterval(() => { if (document.visibilityState === 'visible') void carregar() }, 15000); return () => clearInterval(t) }, [carregar])
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }) }, [msgs?.length])
  async function enviar(e: FormEvent) {
    e.preventDefault(); const t = texto.trim(); if (!t || enviando) return
    setEnviando(true); setErro(null)
    try { await api.enviar(t); setTexto(''); await carregar() } catch (x) { setErro((x as Error).message) } finally { setEnviando(false) }
  }
  return (
    <section className="mp-conversa" aria-label={`Conversa com ${escritorio}`}>
      <div className="mp-msgs" aria-live="polite">
        {msgs === null && <p className="mp-vazio">Carregando a conversa…</p>}
        {msgs?.length === 0 && <p className="mp-vazio">Escreva sua dúvida. A equipe do escritório responde por aqui, em horário comercial.</p>}
        {msgs?.map((m) => (
          <div key={m.id} className="mp-msg" data-autor={m.autor === 'cliente' ? 'eu' : 'escritorio'}>
            <p>{m.texto}</p>
            <span>{m.autor === 'cliente' ? 'Você' : m.autor === 'sara' ? 'Assistente do escritório' : escritorio} · {quandoFoi(m.em)}</span>
          </div>
        ))}
        <div ref={fim} />
      </div>
      {erro && <p className="mp-erro" role="alert">{erro}</p>}
      <form className="mp-escrever" onSubmit={enviar}>
        <textarea rows={1} value={texto} maxLength={2000} placeholder="Escreva sua mensagem" aria-label="Escreva sua mensagem"
          onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); void enviar(e as unknown as FormEvent) } }} />
        <button type="submit" className="mp-enviar" disabled={!texto.trim() || enviando} aria-label="Enviar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l18-8L3 4v6l12 2-12 2z" fill="currentColor" /></svg>
        </button>
      </form>
    </section>
  )
}

function Instalar() {
  const [evento, setEvento] = useState<InstalarEvento | null>(null)
  const [ios, setIos] = useState(false)
  const [fechado, setFechado] = useState(() => { try { return localStorage.getItem('mp-instalar') === 'fechado' } catch { return false } })
  useEffect(() => {
    const instalado = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone
    if (instalado) return
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    const f = (e: Event) => { e.preventDefault(); setEvento(e as InstalarEvento) }
    addEventListener('beforeinstallprompt', f); return () => removeEventListener('beforeinstallprompt', f)
  }, [])
  if (fechado || (!evento && !ios)) return null
  const fechar = () => { setFechado(true); try { localStorage.setItem('mp-instalar', 'fechado') } catch { /* sem armazenamento */ } }
  return (
    <aside className="mp-instalar" aria-label="Instalar o Meu Processo">
      <p>{ios ? 'Para abrir pelo ícone: toque em Compartilhar e depois em "Adicionar à Tela de Início".' : 'Instale o Meu Processo e acompanhe pelo ícone, sem procurar o link.'}</p>
      <div>
        {evento && <button type="button" className="mp-btn" onClick={async () => { await evento.prompt(); setEvento(null) }}>Instalar</button>}
        <button type="button" className="mp-link" onClick={fechar}>Agora não</button>
      </div>
    </aside>
  )
}

export function MeuProcesso({ api, demo }: { api: MpApi; demo: boolean }) {
  const [dados, setDados] = useState<MpInicio | null | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)
  const [tela, setTela] = useState<Tela>('inicio')
  const [novas, setNovas] = useState<Set<string>>(new Set())
  const carregar = useCallback(async () => {
    try {
      const d = await api.inicio(); setErro(null); setDados(d)
      if (d) {
        const n = d.atualizacoes.filter((a) => !a.lida).map((a) => a.id)
        setNovas((v) => new Set([...v, ...n]))
        if (n.length) setTimeout(() => { void api.lidas(n) }, 2500)
      }
    } catch (e) { setErro((e as Error).message) }
  }, [api])
  useEffect(() => { void carregar() }, [carregar])
  useEffect(() => { const f = () => { if (document.visibilityState === 'visible') void carregar() }; document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f) }, [carregar])
  const zerarConversa = useCallback(() => setDados((d) => (d ? { ...d, naoLidas: 0 } : d)), [])

  if (dados === undefined && !erro) return <div className="mp-abrindo" role="status">Abrindo o seu processo…</div>
  if (dados === null) return (
    <main className="mp-fora">
      <h1>Este link não está mais valendo</h1>
      <p>Ele pode ter vencido ou sido trocado por um novo. Peça um link atualizado ao seu escritório.</p>
    </main>
  )
  if (!dados) return (
    <main className="mp-fora"><h1>Sem conexão</h1><p>{erro}</p><button type="button" className="mp-btn" onClick={() => void carregar()}>Tentar de novo</button></main>
  )
  const whats = linkWhats(dados.escritorio.whatsapp, `Olá! Sou ${dados.cliente} e estou vendo o meu processo pelo app.`)
  return (
    <div className="mp" data-tela={tela}>
      <header className="mp-topo">
        <p className="mp-escritorio">{dados.escritorio.nome}</p>
        {demo && <span className="mp-demo">Demonstração</span>}
      </header>
      {tela === 'inicio' ? (
        <main className="mp-inicio" id="conteudo">
          <h1 className="mp-ola">Olá, {dados.cliente}</h1>
          {erro && <p className="mp-erro" role="alert">{erro}</p>}
          {dados.casos.length ? dados.casos.map((c) => <Caminho key={c.area + c.fase} caso={c} />) : (
            <section className="mp-caso"><h2 className="mp-fase">Seu caso está sendo preparado</h2><p className="mp-vazio">Assim que ele for registrado, você acompanha cada etapa por aqui.</p></section>
          )}
          <Compromissos d={dados} />
          <Pendencias d={dados} aoConversar={() => setTela('conversa')} />
          <Novidades d={dados} novas={novas} />
          <Instalar />
          <footer className="mp-rodape">
            <p>Os andamentos do seu processo são informados somente aqui no app, depois de conferidos pela equipe do escritório.</p>
            {whats && <a className="mp-link" href={whats} target="_blank" rel="noopener noreferrer">Falar no WhatsApp do escritório</a>}
            <p className="mp-hiadv">Meu Processo · HiAdv</p>
          </footer>
        </main>
      ) : (
        <main className="mp-tela-conversa" id="conteudo">
          <h1 className="mp-titulo-tela">Conversa com o escritório</h1>
          <Conversa api={api} escritorio={dados.escritorio.nome} aoLer={zerarConversa} />
        </main>
      )}
      <nav className="mp-barra" aria-label="Meu Processo">
        <button type="button" aria-current={tela === 'inicio' ? 'page' : undefined} onClick={() => { setTela('inicio'); void carregar() }}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>Meu caso
        </button>
        <button type="button" aria-current={tela === 'conversa' ? 'page' : undefined} onClick={() => setTela('conversa')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>Conversa
          {dados.naoLidas > 0 && <span className="mp-badge" aria-label={`${dados.naoLidas} mensagens novas`}>{dados.naoLidas}</span>}
        </button>
      </nav>
    </div>
  )
}
