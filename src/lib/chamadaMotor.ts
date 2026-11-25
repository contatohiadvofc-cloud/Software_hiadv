// Motor da chamada em grupo (malha: cada aparelho conversa direto com cada outro). Até ~6 pessoas fica leve.
import { ICE, devoLigar, qualidadeVideo, type CanalChamada, type Presenca, type Sinal } from '../data/chamada'

export type Participante = { id: string; email: string; nome: string; stream: MediaStream | null; instavel: boolean }
type Par = { pc: RTCPeerConnection; email: string; nome: string; fazendoOferta: boolean; ignorar: boolean; educado: boolean; stream: MediaStream | null; visto: boolean; queda?: ReturnType<typeof setTimeout> }

export class ChamadaMotor {
  readonly meuId = Math.random().toString(36).slice(2) + Date.now().toString(36)
  local: MediaStream | null = null
  tela: MediaStream | null = null
  private pares = new Map<string, Par>()
  private aoMudar: () => void

  constructor(private canal: CanalChamada, private eu: { email: string; nome: string }, aoMudar: () => void) {
    this.aoMudar = aoMudar
    canal.aoSinal((s) => { void this.aoSinal(s).catch(() => {}) })
    canal.aoPresenca((vivos) => this.sincronizar(vivos))
  }

  async iniciar(video: boolean) {
    this.local = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      video: video ? { width: { ideal: innerWidth < 700 ? 640 : 960 }, height: { ideal: innerWidth < 700 ? 360 : 540 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' } : false,
    })
    await this.canal.entrar({ id: this.meuId, email: this.eu.email, nome: this.eu.nome, video } satisfies Presenca)
    this.aoMudar()
  }

  participantes(): Participante[] {
    return [...this.pares.entries()].map(([id, p]) => ({ id, email: p.email, nome: p.nome, stream: p.stream,
      instavel: p.pc.connectionState === 'disconnected' || p.pc.connectionState === 'failed' }))
  }

  micLigado() { return !!this.local?.getAudioTracks().some((t) => t.enabled) }
  camLigada() { return !!this.local?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live') }
  temCamera() { return !!this.local?.getVideoTracks().length }
  alternarMic() { this.local?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled }); this.aoMudar() }
  alternarCam() { this.local?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled }); this.aoMudar() }

  async compartilharTela() {
    if (this.tela) return this.pararTela()
    try { this.tela = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15 } }, audio: false }) } catch { return }
    const tr = this.tela.getVideoTracks()[0]!
    tr.contentHint = 'detail'
    tr.onended = () => this.pararTela()
    this.pares.forEach((p) => p.pc.addTrack(tr, this.tela!))
    this.aoMudar()
  }
  pararTela() {
    if (!this.tela) return
    const tr = this.tela.getVideoTracks()[0]
    this.pares.forEach((p) => p.pc.getSenders().filter((s) => s.track === tr).forEach((s) => p.pc.removeTrack(s)))
    this.tela.getTracks().forEach((t) => t.stop())
    this.tela = null
    this.aoMudar()
  }

  sair() {
    this.pares.forEach((_p, id) => this.fechar(id))
    this.local?.getTracks().forEach((t) => t.stop())
    this.tela?.getTracks().forEach((t) => t.stop())
    this.canal.sair()
    this.local = null; this.tela = null
  }

  private enviar(para: string, dados: Partial<Sinal>) { this.canal.enviar({ de: this.meuId, para, email: this.eu.email, ...dados }) }

  private criar(id: string, email: string, nome: string): Par {
    const pc = new RTCPeerConnection({ iceServers: ICE, bundlePolicy: 'max-bundle' })
    const p: Par = { pc, email, nome, fazendoOferta: false, ignorar: false, educado: this.meuId < id, stream: null, visto: false }
    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!))
    if (this.tela) pc.addTrack(this.tela.getVideoTracks()[0]!, this.tela)
    pc.onnegotiationneeded = async () => {
      try { p.fazendoOferta = true; await pc.setLocalDescription(); this.enviar(id, { descricao: pc.localDescription!.toJSON() }) }
      catch { /* tenta de novo na próxima negociação */ } finally { p.fazendoOferta = false }
    }
    pc.onicecandidate = (e) => { if (e.candidate) this.enviar(id, { candidato: e.candidate.toJSON() }) }
    pc.ontrack = (e) => { p.stream = e.streams[0] ?? new MediaStream([e.track]); e.track.onunmute = () => this.aoMudar(); this.aoMudar() }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { try { pc.restartIce() } catch { /* sem suporte */ } }
      clearTimeout(p.queda)
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') p.queda = setTimeout(() => { if (this.pares.get(id) === p && pc.connectionState !== 'connected') this.fechar(id) }, 20000)
      this.aoMudar()
    }
    this.pares.set(id, p)
    this.ajustarQualidade()
    this.aoMudar()
    return p
  }

  private async aoSinal(s: Sinal) {
    const p = this.pares.get(s.de) ?? this.criar(s.de, s.email, s.email)
    const pc = p.pc
    if (s.descricao) {
      const colisao = s.descricao.type === 'offer' && (p.fazendoOferta || pc.signalingState !== 'stable')
      p.ignorar = !p.educado && colisao
      if (p.ignorar) return
      await pc.setRemoteDescription(s.descricao)
      if (s.descricao.type === 'offer') { await pc.setLocalDescription(); this.enviar(s.de, { descricao: pc.localDescription!.toJSON() }) }
    } else if (s.candidato) {
      try { await pc.addIceCandidate(s.candidato) } catch (e) { if (!p.ignorar) throw e }
    }
  }

  private sincronizar(vivos: Presenca[]) {
    const ids = new Set(vivos.map((v) => v.id))
    for (const v of vivos) {
      const p = this.pares.get(v.id)
      if (p) { p.visto = true; p.nome = v.nome } else if (devoLigar(this.meuId, v.id)) this.criar(v.id, v.email, v.nome).visto = true
    }
    // só fecha quem já apareceu e saiu (o sinal pode chegar antes da lista atualizar)
    for (const [id, p] of this.pares) if (!ids.has(id) && p.visto) this.fechar(id)
    this.aoMudar()
  }

  private fechar(id: string) {
    const p = this.pares.get(id); if (!p) return
    clearTimeout(p.queda)
    try { p.pc.close() } catch { /* já fechada */ }
    this.pares.delete(id)
    this.ajustarQualidade()
    this.aoMudar()
  }

  private ajustarQualidade() {
    const q = qualidadeVideo(this.pares.size)
    this.pares.forEach((p) => p.pc.getSenders().forEach((s) => {
      if (!s.track || s.track.kind !== 'video' || (this.tela && s.track === this.tela.getVideoTracks()[0])) return
      const par = s.getParameters()
      if (!par.encodings?.length) par.encodings = [{}]
      par.encodings[0]!.maxBitrate = q.maxBitrate
      par.encodings[0]!.scaleResolutionDownBy = q.escala
      s.setParameters(par).catch(() => {})
    }))
  }
}
