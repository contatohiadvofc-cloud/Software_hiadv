/** Biblioteca, integrações e agentes: tudo é do escritório em uso. */
export type TipoBiblioteca = 'modelo' | 'jurisprudencia' | 'referencia' | 'tese'
export const TIPOS_BIBLIOTECA: Array<{ tipo: TipoBiblioteca; rotulo: string; plural: string; ajuda: string }> = [
  { tipo: 'modelo', rotulo: 'Modelo', plural: 'Modelos', ajuda: 'Peças e documentos que servem de base: kit do cliente, requerimento, inicial, quesitos, recursos.' },
  { tipo: 'jurisprudencia', rotulo: 'Jurisprudência', plural: 'Jurisprudência', ajuda: 'Precedentes que o escritório aceita citar, com ementa e link.' },
  { tipo: 'referencia', rotulo: 'Referência', plural: 'Referências', ajuda: 'Doutrina, artigos, notas técnicas e trechos de fundamentação.' },
  { tipo: 'tese', rotulo: 'Tese', plural: 'Teses', ajuda: 'Linhas de argumentação do escritório para cada situação.' },
]

export type ItemBiblioteca = {
  id: string; tipo: TipoBiblioteca; titulo: string; area: string | null; peca: string | null
  conteudo: string | null; link: string | null; arquivo: string | null; arquivoNome: string | null; tamanho: number | null
  criadoPor: string | null; criadoEm: string
}
/** Pacote de roteiros pronto (núcleo do HiAdv) que o gestor copia para a biblioteca do escritório. */
export type PacoteBiblioteca = { slug: string; nome: string; descricao: string; areas: string[]; itens: number; adicionados: number; titulos: string[] }

export function situacaoPacote(p: Pick<PacoteBiblioteca, 'itens' | 'adicionados'>): { pronto: boolean; botao: string } {
  if (p.adicionados >= p.itens) return { pronto: true, botao: 'Já está na sua biblioteca' }
  if (p.adicionados > 0) return { pronto: false, botao: `Adicionar os ${p.itens - p.adicionados} que faltam` }
  return { pronto: false, botao: `Adicionar ${p.itens} roteiros` }
}

export type NovoItemBiblioteca = { tipo: TipoBiblioteca; titulo: string; area: string; peca: string; conteudo: string; link: string }

export type Servico = 'claude' | 'zapsign' | 'google_drive'
export type Integracao = {
  servico: Servico; ativo: boolean; modo: string | null; limiteMensal: number | null
  temChave: boolean; chaveFinal: string | null; configuradoEm: string | null; configuradoPor: string | null
}
export const SERVICOS: Record<Servico, { nome: string; descricao: string; usaChave: boolean; dicaChave?: string }> = {
  claude: { nome: 'Claude (IA dos agentes)', descricao: 'Motor dos agentes: leitura de documentos, minutas, quesitos e mensagens. O consumo é cobrado na conta do escritório.', usaChave: true, dicaChave: 'Chave da API Anthropic do escritório (começa com sk-ant-).' },
  zapsign: { nome: 'ZapSign (assinatura)', descricao: 'Envia o kit do cliente (contrato, procuração, declaração) preenchido para assinatura pelo WhatsApp. Cada envio é cobrado na conta ZapSign do escritório.', usaChave: true, dicaChave: 'Token da API da ZapSign do escritório.' },
  google_drive: { nome: 'Google Drive', descricao: 'Lê a pasta de clientes compartilhada com o HiAdv para relacionar pastas aos clientes. Nada é lido sem aprovação.', usaChave: false },
}

export type Agente = {
  agente: string; nome: string; descricao: string; areas: string[] | null; precisa: string[]; usaModelo: boolean
  /** Funciona por regras, sem IA e sem custo: liga sem chave. */
  semCusto: boolean
  ativo: boolean; etapas: string[]; modeloId: string | null; modeloTitulo: string | null
  parametros: Record<string, unknown>
}

/** Agentes que ainda não estão prontos para ligar. */
export const AGENTES_EM_BREVE = ['organizadora', 'verbas']
export type EtapaEscritorio = { area: string; areaNome: string; status: string }

/** O que falta para o agente poder ser ligado (mostrado como aviso, o servidor confere de novo). */
export function faltasDoAgente(a: Agente, integracoes: Integracao[], modeloEscolhido: string | null): string[] {
  const f: string[] = []
  const claude = integracoes.find((i) => i.servico === 'claude')
  if (a.precisa.includes('claude') && !(claude?.ativo && claude.temChave)) f.push('Ativar a Claude em Integrações')
  if (a.usaModelo && !modeloEscolhido) f.push('Escolher o modelo da Biblioteca')
  if (a.semCusto && !AGENTES_EM_BREVE.includes(a.agente) && a.etapas.length === 0) f.push('Escolher em quais etapas entra')
  return f
}

export function tamanhoTela(b: number | null): string {
  if (!b) return ''
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

/** Nome seguro para guardar o arquivo: sem acentos e símbolos, mantendo a extensão. */
export function nomeArquivoSeguro(nome: string): string {
  const semAcento = nome.normalize('NFD').replace(/[̀-ͯ]/g, '')
  const limpo = semAcento.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return (limpo || 'arquivo').slice(-120)
}

export const EXTENSOES_BIBLIOTECA = ['.docx', '.doc', '.pdf', '.txt', '.odt', '.rtf']
export const LIMITE_ARQUIVO = 25 * 1024 * 1024
export function validarArquivo(f: { name: string; size: number }): string | null {
  const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'))
  if (!EXTENSOES_BIBLIOTECA.includes(ext)) return 'Envie Word, PDF, ODT, RTF ou texto.'
  if (f.size > LIMITE_ARQUIVO) return 'O arquivo passa de 25 MB.'
  return null
}
