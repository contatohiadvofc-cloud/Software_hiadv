import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useApi, useSessao } from '../lib/contexto'
import { nomesComApelidos, primeiroNome, resumo, tituloConversa, type ChamadaAtiva, type Conversa } from '../data/conversas'
import { destravarSom, estaVendo, lerPrefs, notificarSistema, tocar, tocarChamada, type PrefsAvisos } from '../lib/avisos'

type Aviso = { id: string; conversa: string; titulo: string; texto: string }

/** Fica ligado em todo o HiAdv: avisa mensagem nova e chamada chegando, mesmo fora da tela de Conversas. */
export function AvisosConversas() {
  const api = useApi()
  const { perfil } = useSessao()
  const nav = useNavigate()
  const eu = perfil?.email ?? ''
  const [prefs, setPrefs] = useState<PrefsAvisos>(lerPrefs)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [tocando, setTocando] = useState<ChamadaAtiva | null>(null)
  const parar = useRef<(() => void) | null>(null)
  const vistos = useRef<Map<string, string> | null>(null)
  const chamadasVistas = useRef<Set<string> | null>(null)

  useEffect(() => { destravarSom(); const f = () => setPrefs(lerPrefs()); addEventListener('hiadv-avisos', f); return () => removeEventListener('hiadv-avisos', f) }, [])

  const convs = useQuery({ queryKey: ['chat-lista', perfil?.escritorioId], queryFn: () => api.chatLista(), enabled: !!perfil, refetchInterval: 10_000, retry: false })
  const pessoas = useQuery({ queryKey: ['chat-pessoas', perfil?.escritorioId], queryFn: () => api.chatPessoas(), enabled: !!perfil, staleTime: 300_000, retry: false })
  const contatos = useQuery({ queryKey: ['contatos', perfil?.escritorioId], queryFn: () => api.contatoLista(), enabled: !!perfil, staleTime: 60_000, retry: false })
  const chamadas = useQuery({ queryKey: ['chamadas-ativas', perfil?.escritorioId], queryFn: () => api.reuniaoMinhasAtivas(), enabled: !!perfil && prefs.chamada, refetchInterval: 8_000, retry: false })
  const nomes = useMemo(() => nomesComApelidos(pessoas.data ?? [], contatos.data ?? []), [pessoas.data, contatos.data])

  function abrir(conversa: string, atender?: string) {
    void nav({ to: '/conversas', search: (atender ? { c: conversa, atender } : { c: conversa }) as never })
  }

  // mensagens novas
  useEffect(() => {
    const lista: Conversa[] = convs.data ?? []
    if (!lista.length && !vistos.current) return
    if (!vistos.current) { vistos.current = new Map(lista.map((c) => [c.id, c.ultima?.criadoEm ?? ''])); return }
    const novas: Aviso[] = []
    for (const c of lista) {
      const antes = vistos.current.get(c.id) ?? ''
      const u = c.ultima
      vistos.current.set(c.id, u?.criadoEm ?? antes)
      if (!u || u.criadoEm <= antes || u.autor === eu || estaVendo(c.id)) continue
      const quem = primeiroNome(nomes.get(u.autor) ?? u.autor)
      const titulo = c.tipo === 'direta' ? quem : `${quem} · ${tituloConversa(c, eu, nomes)}`
      novas.push({ id: `${c.id}:${u.criadoEm}`, conversa: c.id, titulo, texto: resumo(u) })
    }
    if (!novas.length) return
    tocar(prefs.som)
    if (prefs.sistema) novas.forEach((a) => notificarSistema(a.titulo, a.texto, () => abrir(a.conversa)))
    if (prefs.popup) setAvisos((v) => [...novas, ...v].slice(0, 3))
  }, [convs.data]) // eslint-disable-line react-hooks/exhaustive-deps

  // some sozinho
  useEffect(() => {
    if (!avisos.length) return
    const t = setTimeout(() => setAvisos((v) => v.slice(0, -1)), 7000)
    return () => clearTimeout(t)
  }, [avisos])

  // chamada chegando
  useEffect(() => {
    const lista = chamadas.data ?? []
    if (!chamadasVistas.current) { chamadasVistas.current = new Set(lista.map((c) => c.id)); return }
    if (tocando && !lista.some((c) => c.id === tocando.id)) { parar.current?.(); parar.current = null; setTocando(null) }
    const nova = lista.find((c) => !chamadasVistas.current!.has(c.id) && c.iniciadaPor !== eu && !c.participantes.includes(eu))
    lista.forEach((c) => chamadasVistas.current!.add(c.id))
    if (!nova || tocando) return
    setTocando(nova)
    parar.current = tocarChamada()
    const quem = primeiroNome(nomes.get(nova.iniciadaPor) ?? nova.iniciadaPor)
    notificarSistema(`${quem} está chamando`, nova.video ? 'Chamada de vídeo no HiAdv' : 'Chamada de voz no HiAdv', () => abrir(nova.conversaId, nova.id))
  }, [chamadas.data]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => parar.current?.(), [])
  useEffect(() => { if (!tocando) return; const t = setTimeout(() => { parar.current?.(); setTocando(null) }, 45_000); return () => clearTimeout(t) }, [tocando])

  function encerrarToque() { parar.current?.(); parar.current = null; setTocando(null) }

  if (!avisos.length && !tocando) return null
  return (
    <div className="av-pilha" aria-live="polite">
      {tocando && (
        <div className="av-card av-chamada" role="alertdialog" aria-label="Chamada chegando">
          <span className="av-pulso" aria-hidden="true" />
          <div className="av-txt"><b>{primeiroNome(nomes.get(tocando.iniciadaPor) ?? tocando.iniciadaPor)} está chamando</b><span>{tocando.video ? 'Chamada de vídeo' : 'Chamada de voz'}</span></div>
          <div className="av-bts">
            <button type="button" className="av-recusar" onClick={encerrarToque}>Recusar</button>
            <button type="button" className="av-atender" onClick={() => { encerrarToque(); abrir(tocando.conversaId, tocando.id) }}>Atender</button>
          </div>
        </div>
      )}
      {avisos.map((a) => (
        <div key={a.id} className="av-card" role="status">
          <button type="button" className="av-abrir" onClick={() => { setAvisos((v) => v.filter((x) => x.id !== a.id)); abrir(a.conversa) }}>
            <span className="av-txt"><b>{a.titulo}</b><span>{a.texto}</span></span>
          </button>
          <button type="button" className="av-fechar" aria-label="Fechar aviso" onClick={() => setAvisos((v) => v.filter((x) => x.id !== a.id))}>×</button>
        </div>
      ))}
    </div>
  )
}
