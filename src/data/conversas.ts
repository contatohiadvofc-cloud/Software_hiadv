// Conversas da equipe (por escritório) e Comunidades HiAdv (entre escritórios).
// Tipos e regras puras: o que é mostrado na lista, como os anexos são tratados e os limites de envio.

export type Anexo = { path: string; nome: string; tipo: string; tamanho: number; duracao?: number; largura?: number; altura?: number }
export type Reacoes = Record<string, string>

export type Mensagem = {
  id: string
  autor: string
  autorNome?: string | null
  autorEscritorio?: string | null
  texto: string | null
  anexo: Anexo | null
  respostaA: string | null
  reacoes: Reacoes
  criadoEm: string
  editadoEm: string | null
  /** só na tela, enquanto o envio não termina */
  enviando?: boolean
}

export type TipoConversa = 'equipe' | 'direta' | 'grupo'
export type Conversa = {
  id: string
  tipo: TipoConversa
  titulo: string | null
  membros: string[]
  ultima: { autor: string; texto: string | null; anexo: Anexo | null; criadoEm: string } | null
  naoLidas: number
  ultimaEm: string
}

export type Comunidade = {
  id: string
  nome: string
  descricao: string | null
  areas: string[] | null
  soMasters: boolean
  quemPosta: 'todos' | 'moderadores'
  anexos: boolean
  audios: boolean
  ativa: boolean
  ordem: number
  ultima: { autorNome: string | null; texto: string | null; anexo: Anexo | null; criadoEm: string } | null
  naoLidas: number
  ultimaEm: string
  podePostar: boolean
  moderador: boolean
  /** Segundos mínimos entre mensagens da mesma pessoa (0 = livre). */
  intervaloSeg: number
  /** Aceita links externos. */
  links: boolean
  /** Escritório só entra depois de aprovado pela moderação. */
  aprovacao: boolean
  /** O escritório de quem está vendo já participa. */
  participo: boolean
  /** Situação do pedido de entrada deste escritório. */
  entrada: 'pendente' | 'aprovado' | 'recusado' | null
  /** Pedidos esperando decisão (só a moderação vê). */
  pedidos: number
}

export type ComunidadeForm = {
  id?: string; nome: string; descricao: string; areas: string[]; soMasters: boolean
  quemPosta: 'todos' | 'moderadores'; anexos: boolean; audios: boolean; ativa: boolean
  intervaloSeg: number; links: boolean; aprovacao: boolean
}
export type PedidoEntrada = { escritorioId: string; escritorio: string; status: 'pendente' | 'aprovado' | 'recusado'; pedidoPor: string | null; pedidoEm: string }
/** Até quantas pessoas por chamada: acima disso a qualidade cai em internet de celular. */
export const LIMITE_CHAMADA = 6
export const INTERVALOS = [{ seg: 0, rotulo: 'Livre' }, { seg: 30, rotulo: '30 s' }, { seg: 120, rotulo: '2 min' }, { seg: 600, rotulo: '10 min' }] as const
const LINK = /(https?:\/\/|www\.|[a-z0-9-]+\.(com|br|net|org|io|me|app|site|link|ly)(\/|\s|$))/i
/** Mesmo critério do servidor: avisa antes de enviar. */
export const temLink = (t: string) => LINK.test(t)
export type PessoaComunidade = { email: string; nome: string; escritorio: string | null; silenciadoAte: string | null }
export type PessoaEquipe = { email: string; nome: string; papel: string | null }

export const REACOES = ['❤️', '👍', '😂', '😮', '🙏', '🔥', '✅', '😢'] as const
export const LIMITE_ARQUIVO = 25 * 1024 * 1024
export const LIMITE_TEXTO = 4000
export const LIMITE_AUDIO_SEG = 5 * 60

export const iniciais = (n: string) => {
  const p = n.replace(/\(.*?\)/g, '').replace(/@.*/, '').split(/[\s._-]+/).filter((x) => x.length > 1)
  return (p.slice(0, 2).map((x) => x[0]!.toUpperCase()).join('') || n.slice(0, 2).toUpperCase())
}

export const primeiroNome = (n: string) => n.replace(/@.*/, '').split(/\s+/)[0] ?? n

/** Nome que aparece na lista: a equipe, o grupo ou a outra pessoa da conversa direta. */
export function tituloConversa(c: Pick<Conversa, 'tipo' | 'titulo' | 'membros'>, eu: string, nomes: Map<string, string>): string {
  if (c.tipo === 'equipe') return c.titulo || 'Equipe'
  if (c.tipo === 'grupo') return c.titulo || 'Grupo'
  const outro = c.membros.find((m) => m !== eu) ?? eu
  return nomes.get(outro) ?? outro.replace(/@.*/, '')
}

export type TipoAnexo = 'imagem' | 'audio' | 'video' | 'pdf' | 'arquivo'
export function tipoAnexo(mime: string): TipoAnexo {
  if (mime.startsWith('image/')) return 'imagem'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  if (mime === 'application/pdf') return 'pdf'
  return 'arquivo'
}

/** Prévia curta da última mensagem (lista de conversas). */
export function resumo(u: { texto: string | null; anexo: Anexo | null } | null): string {
  if (!u) return 'Nenhuma mensagem ainda'
  if (u.anexo) {
    const t = tipoAnexo(u.anexo.tipo)
    const rot = { imagem: 'Foto', audio: 'Áudio', video: 'Vídeo', pdf: 'PDF', arquivo: 'Arquivo' }[t]
    const dur = t === 'audio' && u.anexo.duracao ? ` · ${duracaoTela(u.anexo.duracao)}` : ''
    return u.texto ? `${rot}: ${u.texto}` : `${rot}${dur}`
  }
  return (u.texto ?? '').replace(/\s+/g, ' ')
}

export function duracaoTela(seg: number): string {
  const s = Math.max(0, Math.round(seg))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function tamanhoTela(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

const TZ = 'America/Sao_Paulo'
const diaChave = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ })

/** Hora curta da lista: hoje mostra a hora; ontem, "Ontem"; nesta semana, o dia; depois, a data. */
export function quandoCurto(iso: string, agora = new Date()): string {
  const d = new Date(iso)
  const hoje = diaChave(agora), dia = diaChave(d)
  if (dia === hoje) return d.toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const ontem = diaChave(new Date(agora.getTime() - 864e5))
  if (dia === ontem) return 'Ontem'
  if (agora.getTime() - d.getTime() < 6 * 864e5) return d.toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'short' }).replace('.', '')
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' })
}

export function horaMensagem(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

/** Separador de dia dentro da conversa. */
export function rotuloDia(iso: string, agora = new Date()): string {
  const d = new Date(iso)
  const dia = diaChave(d)
  if (dia === diaChave(agora)) return 'Hoje'
  if (dia === diaChave(new Date(agora.getTime() - 864e5))) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { timeZone: TZ, day: 'numeric', month: 'long', year: d.getFullYear() === agora.getFullYear() ? undefined : 'numeric' })
}

export type Bloco = { tipo: 'dia'; rotulo: string; chave: string } | { tipo: 'msg'; m: Mensagem; agrupada: boolean; ultimaDoGrupo: boolean }

/** Separa por dia e junta mensagens seguidas da mesma pessoa (até 5 min), como nos apps de mensagem. */
export function montarBlocos(msgs: Mensagem[], agora = new Date()): Bloco[] {
  const out: Bloco[] = []
  let diaAnt = ''
  msgs.forEach((m, i) => {
    const dia = diaChave(new Date(m.criadoEm))
    if (dia !== diaAnt) { out.push({ tipo: 'dia', rotulo: rotuloDia(m.criadoEm, agora), chave: dia }); diaAnt = dia }
    const ant = msgs[i - 1], prox = msgs[i + 1]
    const junto = (a?: Mensagem, b?: Mensagem) => !!a && !!b && a.autor === b.autor && diaChave(new Date(a.criadoEm)) === diaChave(new Date(b.criadoEm))
      && Math.abs(new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()) < 5 * 60e3
    out.push({ tipo: 'msg', m, agrupada: junto(ant, m), ultimaDoGrupo: !junto(m, prox) })
  })
  return out
}

/** Contagem das reações para mostrar embaixo da mensagem: [emoji, quantas, eu reagi]. */
export function contarReacoes(r: Reacoes, eu: string): [string, number, boolean][] {
  const mapa = new Map<string, { n: number; meu: boolean }>()
  for (const [quem, e] of Object.entries(r)) {
    const v = mapa.get(e) ?? { n: 0, meu: false }
    v.n++; if (quem === eu) v.meu = true
    mapa.set(e, v)
  }
  return [...mapa.entries()].sort((a, b) => b[1].n - a[1].n).map(([e, v]) => [e, v.n, v.meu])
}

/** Confere o arquivo antes de subir. Devolve a mensagem de erro ou null. */
export function validarArquivo(f: { size: number; type: string }, permite: { anexos: boolean; audios: boolean } = { anexos: true, audios: true }): string | null {
  if (f.size > LIMITE_ARQUIVO) return 'O arquivo passa de 25 MB. Envie um menor ou um link.'
  if (f.size === 0) return 'O arquivo está vazio.'
  const audio = f.type.startsWith('audio/')
  if (audio && !permite.audios) return 'Esta conversa não aceita áudios.'
  if (!audio && !permite.anexos) return 'Esta conversa não aceita arquivos.'
  return null
}

/** Caminho do arquivo no armazenamento: pasta da conversa + nome seguro, sem acento nem espaço. */
export function caminhoAnexo(pasta: string, nome: string, agora = Date.now()): string {
  const limpo = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-80) || 'arquivo'
  return `${pasta}/${agora.toString(36)}-${Math.random().toString(36).slice(2, 7)}-${limpo}`
}

/** Formato de áudio que o aparelho grava, do mais leve ao mais compatível (iPhone grava em mp4). */
export function formatoAudio(suporta: (t: string) => boolean): string | undefined {
  return ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'].find(suporta)
}

export const NOMES_AREAS: Record<string, string> = {
  administrativo: 'Previdenciário administrativo', judicial: 'Previdenciário judicial', trabalhista: 'Trabalhista',
  civel: 'Cível e família', bancario: 'Bancário', penal: 'Penal', extrajudicial: 'Extrajudicial',
}

export function validarComunidade(f: ComunidadeForm): string | null {
  const n = f.nome.trim()
  if (n.length < 2 || n.length > 60) return 'O nome precisa ter entre 2 e 60 caracteres.'
  if (f.descricao.trim().length > 200) return 'A descrição pode ter até 200 caracteres.'
  return null
}

/** Quem pode ver a comunidade, em uma frase. */
export function publicoComunidade(c: Pick<Comunidade, 'soMasters' | 'areas'>): string {
  const quem = c.soMasters ? 'Gestores Master' : 'Equipes'
  if (!c.areas?.length) return c.soMasters ? 'Gestores Master de todos os escritórios' : 'Todas as equipes de todos os escritórios'
  return `${quem} que atuam em ${c.areas.map((a) => NOMES_AREAS[a] ?? a).join(', ').replace(/, ([^,]*)$/, ' ou $1')}`
}
