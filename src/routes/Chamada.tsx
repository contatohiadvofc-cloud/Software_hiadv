import { useEffect, useReducer, useRef, useState } from 'react'
import { useApi } from '../lib/contexto'
import { useToast } from '../design/components/Toast'
import { ChamadaMotor, type Participante } from '../lib/chamadaMotor'
import { cronometro } from '../data/chamada'
import { iniciais } from '../data/conversas'
import { Ic } from './Conversas'

const D = {
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3',
  micOff: 'M1 1l22 22M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.6M17 16.9A7 7 0 0 1 5 12v-2m14 0v2c0 .8-.1 1.5-.4 2.2M12 19v3',
  cam: 'M23 7l-7 5 7 5zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
  camOff: 'M1 1l22 22M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.7 0H14a2 2 0 0 1 2 2v3.3l1 1L23 7v10',
  tela: 'M2 4h20v12H2zM8 20h8M12 16v4',
  sair: 'M10.7 13.3a16 16 0 0 0 3.4 2.4l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8M23 1 1 23',
}

function Tile({ nome, stream, eu, instavel, mudo }: { nome: string; stream: MediaStream | null; eu?: boolean; instavel?: boolean; mudo?: boolean }) {
  const v = useRef<HTMLVideoElement>(null)
  const temVideo = !!stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live' && !t.muted)
  useEffect(() => { if (v.current && v.current.srcObject !== stream) v.current.srcObject = stream }, [stream])
  return (
    <div className="ch-tile" data-instavel={instavel || undefined} data-video={temVideo || undefined}>
      <video ref={v} autoPlay playsInline muted={eu} />
      {!temVideo && <span className="ch-av" aria-hidden="true">{iniciais(nome)}</span>}
      <span className="ch-nome">{eu ? 'Você' : nome}{mudo && ' · mudo'}{instavel && ' · reconectando'}</span>
    </div>
  )
}

/** Tela da chamada: grade de pessoas, controles embaixo e cronômetro. Áudio e vídeo vão direto entre os aparelhos. */
export function Chamada({ id, video, titulo, eu, aoSair }: { id: string; video: boolean; titulo: string; eu: { email: string; nome: string }; aoSair: () => void }) {
  const api = useApi()
  const toast = useToast()
  const [, atualizar] = useReducer((x: number) => x + 1, 0)
  const motor = useRef<ChamadaMotor | null>(null)
  const [pronta, setPronta] = useState(false)
  const [inicio] = useState(Date.now())
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => {
    const canal = api.reuniaoCanal(id)
    if (!canal) { toast('Na prévia não há chamada de verdade.', 'danger'); aoSair(); return }
    const m = new ChamadaMotor(canal, eu, atualizar)
    motor.current = m
    let trava: { release: () => Promise<void> } | null = null
    m.iniciar(video).then(async () => {
      setPronta(true)
      try { trava = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null } catch { /* sem suporte */ }
    }).catch((e: Error) => {
      toast(/Permission|NotAllowed|denied/i.test(e.name + e.message) ? `Sem acesso ao ${video ? 'microfone ou à câmera' : 'microfone'}. Libere a permissão do navegador e tente de novo.` : e.message, 'danger')
      m.sair(); aoSair()
    })
    const t = setInterval(() => setAgora(Date.now()), 1000)
    const fechar = () => m.sair()
    addEventListener('pagehide', fechar)
    return () => { clearInterval(t); removeEventListener('pagehide', fechar); m.sair(); void trava?.release().catch(() => {}) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const m = motor.current
  const pessoas: Participante[] = m?.participantes() ?? []
  async function sair() {
    m?.sair()
    if (pessoas.length === 0) { try { await api.reuniaoEncerrar(id) } catch { /* encerra sozinha depois */ } }
    aoSair()
  }

  return (
    <div className="ch" role="dialog" aria-modal="true" aria-label={`Chamada: ${titulo}`}>
      <header className="ch-topo">
        <div><b>{titulo}</b><span>{pronta ? `${pessoas.length + 1} na chamada · ${cronometro(agora - inicio)}` : 'Conectando…'}</span></div>
        <span className="ch-seguro">Criptografada · não é gravada</span>
      </header>
      <div className="ch-grade" data-n={Math.min(pessoas.length + 1 + (m?.tela ? 1 : 0), 9)}>
        <Tile nome={eu.nome} stream={m?.local ?? null} eu mudo={!m?.micLigado()} />
        {m?.tela && <Tile nome="Sua tela" stream={m.tela} eu />}
        {pessoas.map((p) => <Tile key={p.id} nome={p.nome} stream={p.stream} instavel={p.instavel} />)}
        {pronta && pessoas.length === 0 && <p className="ch-espera">Esperando alguém entrar. Quem está na conversa vê o aviso para entrar.</p>}
      </div>
      <footer className="ch-controles">
        <button type="button" aria-pressed={!m?.micLigado()} aria-label={m?.micLigado() ? 'Desligar microfone' : 'Ligar microfone'} onClick={() => m?.alternarMic()}><Ic d={m?.micLigado() ? D.mic : D.micOff} /></button>
        {m?.temCamera() && <button type="button" aria-pressed={!m.camLigada()} aria-label={m.camLigada() ? 'Desligar câmera' : 'Ligar câmera'} onClick={() => m.alternarCam()}><Ic d={m.camLigada() ? D.cam : D.camOff} /></button>}
        {'getDisplayMedia' in (navigator.mediaDevices ?? {}) && innerWidth > 700 && <button type="button" aria-pressed={!!m?.tela} aria-label="Compartilhar tela" onClick={() => void m?.compartilharTela()}><Ic d={D.tela} /></button>}
        <button type="button" className="ch-sair" aria-label="Sair da chamada" onClick={() => void sair()}><Ic d={D.sair} /></button>
      </footer>
    </div>
  )
}
