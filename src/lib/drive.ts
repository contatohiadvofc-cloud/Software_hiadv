/** Google Drive do escritório, no navegador. Permissão "drive.file": o HiAdv só enxerga os arquivos e pastas que a pessoa escolher no seletor do Google.
 *  Nada é copiado para o HiAdv: os arquivos são lidos na hora e o resultado é salvo de volta na pasta escolhida. */

export type ConfigGoogle = { clientId: string; apiKey: string; appId: string }
export type ArquivoDrive = { id: string; nome: string; mime: string }
export type PastaDrive = { id: string; nome: string }

const ESCOPO = 'https://www.googleapis.com/auth/drive.file'
export const TIPOS_LEITURA = [
  'application/vnd.google-apps.document', 'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png',
]
const LIMITE_BYTES = 15 * 1024 * 1024

export function configCompleta(c: Partial<ConfigGoogle> | null | undefined): c is ConfigGoogle {
  return !!c && /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(c.clientId ?? '') && /^AIza[0-9A-Za-z_-]{30,}$/.test(c.apiKey ?? '') && /^[0-9]{6,}$/.test(c.appId ?? '')
}

/** Nome do arquivo salvo, no padrão do escritório (data invertida). */
export function nomeArquivo(titulo: string, cliente: string, hoje = new Date()): string {
  const d = `${hoje.getFullYear()}_${String(hoje.getMonth() + 1).padStart(2, '0')}_${String(hoje.getDate()).padStart(2, '0')}`
  const limpo = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  return [d, limpo(titulo), limpo(cliente)].filter(Boolean).join(' - ')
}

/** Texto de um .docx (só os parágrafos do corpo). */
export async function textoDeDocx(bytes: ArrayBuffer): Promise<string> {
  const { default: PizZip } = await import('pizzip')
  const xml = new PizZip(bytes).file('word/document.xml')?.asText() ?? ''
  return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n').trim()
}

// ---------- Carregamento dos scripts do Google (só quando a pessoa usa o Drive) ----------
type Gapi = { load: (n: string, cb: () => void) => void }
type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void; callback: (r: { access_token?: string; error?: string }) => void }
declare global {
  interface Window {
    gapi?: Gapi
    google?: { accounts: { oauth2: { initTokenClient: (o: Record<string, unknown>) => TokenClient } }; picker: any }
  }
}
const scripts = new Map<string, Promise<void>>()
function carregar(src: string): Promise<void> {
  if (!scripts.has(src)) scripts.set(src, new Promise((ok, falha) => {
    const s = document.createElement('script'); s.src = src; s.async = true
    s.onload = () => ok(); s.onerror = () => { scripts.delete(src); falha(new Error('Não foi possível abrir o Google Drive. Confira a conexão.')) }
    document.head.appendChild(s)
  }))
  return scripts.get(src)!
}

let token: { valor: string; ate: number } | null = null

async function obterToken(cfg: ConfigGoogle): Promise<string> {
  if (token && token.ate > Date.now() + 60_000) return token.valor
  await carregar('https://accounts.google.com/gsi/client')
  return new Promise((ok, falha) => {
    const cliente = window.google!.accounts.oauth2.initTokenClient({ client_id: cfg.clientId, scope: ESCOPO, callback: () => {} }) as TokenClient
    cliente.callback = (r) => {
      if (!r.access_token) return falha(new Error(r.error === 'access_denied' ? 'O acesso ao Drive não foi permitido.' : 'Não foi possível entrar no Google Drive.'))
      token = { valor: r.access_token, ate: Date.now() + 50 * 60_000 }
      ok(r.access_token)
    }
    cliente.requestAccessToken({ prompt: token ? '' : 'consent' })
  })
}

async function picker(cfg: ConfigGoogle, pasta: boolean): Promise<ArquivoDrive[]> {
  const acesso = await obterToken(cfg)
  await carregar('https://apis.google.com/js/api.js')
  await new Promise<void>((ok) => window.gapi!.load('picker', () => ok()))
  const g = window.google!.picker
  return new Promise((ok) => {
    const visao = pasta
      ? new g.DocsView(g.ViewId.FOLDERS).setSelectFolderEnabled(true).setIncludeFolders(true).setMimeTypes('application/vnd.google-apps.folder')
      : new g.DocsView(g.ViewId.DOCS).setIncludeFolders(true).setMimeTypes(TIPOS_LEITURA.join(','))
    let b = new g.PickerBuilder().setOAuthToken(acesso).setDeveloperKey(cfg.apiKey).setAppId(cfg.appId).setLocale('pt-BR').addView(visao)
      .setTitle(pasta ? 'Escolha a pasta do cliente' : 'Escolha os arquivos do cliente')
      .setCallback((d: { action: string; docs?: { id: string; name: string; mimeType: string }[] }) => {
        if (d.action === g.Action.PICKED) ok((d.docs ?? []).map((x) => ({ id: x.id, nome: x.name, mime: x.mimeType })))
        else if (d.action === g.Action.CANCEL) ok([])
      })
    if (!pasta) b = b.enableFeature(g.Feature.MULTISELECT_ENABLED)
    b.build().setVisible(true)
  })
}

export const escolherArquivos = (cfg: ConfigGoogle) => picker(cfg, false)
export async function escolherPasta(cfg: ConfigGoogle): Promise<PastaDrive | null> {
  const [p] = await picker(cfg, true)
  return p ? { id: p.id, nome: p.nome } : null
}

async function drive(cfg: ConfigGoogle, caminho: string, init: RequestInit = {}): Promise<Response> {
  const acesso = await obterToken(cfg)
  const r = await fetch(`https://www.googleapis.com/${caminho}`, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${acesso}` } })
  if (r.status === 401) { token = null; throw new Error('A conexão com o Drive expirou. Tente de novo.') }
  if (r.status === 404 || r.status === 403) throw new Error('O HiAdv não tem acesso a este arquivo. Escolha de novo pelo seletor do Drive.')
  if (!r.ok) throw new Error('O Google Drive não respondeu. Tente de novo.')
  return r
}

/** Lê o texto de um arquivo escolhido. PDF e imagem passam pelo reconhecimento de texto do próprio Google (cópia temporária, apagada em seguida). */
export async function lerTexto(cfg: ConfigGoogle, a: ArquivoDrive): Promise<string> {
  if (a.mime === 'application/vnd.google-apps.document') return (await drive(cfg, `drive/v3/files/${a.id}/export?mimeType=text/plain`)).text()
  const meta = await (await drive(cfg, `drive/v3/files/${a.id}?fields=size`)).json() as { size?: string }
  if (Number(meta.size ?? 0) > LIMITE_BYTES) throw new Error(`"${a.nome}" passa de 15 MB. Escolha um arquivo menor.`)
  if (a.mime === 'text/plain') return (await drive(cfg, `drive/v3/files/${a.id}?alt=media`)).text()
  if (a.mime.includes('wordprocessingml')) return textoDeDocx(await (await drive(cfg, `drive/v3/files/${a.id}?alt=media`)).arrayBuffer())
  const copia = await (await drive(cfg, `drive/v3/files/${a.id}/copy?fields=id`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `HiAdv leitura temporária - ${a.nome}`, mimeType: 'application/vnd.google-apps.document' }),
  })).json() as { id: string }
  try {
    return await (await drive(cfg, `drive/v3/files/${copia.id}/export?mimeType=text/plain`)).text()
  } finally {
    await drive(cfg, `drive/v3/files/${copia.id}`, { method: 'DELETE' }).catch(() => {})
  }
}

/** Salva o texto como Google Docs na pasta escolhida. Devolve o link para abrir. */
export async function salvarNoDrive(cfg: ConfigGoogle, pasta: PastaDrive, nome: string, texto: string): Promise<string> {
  const limite = 'hiadv' + Math.random().toString(36).slice(2)
  const corpo = [
    `--${limite}`, 'Content-Type: application/json; charset=UTF-8', '',
    JSON.stringify({ name: nome, parents: [pasta.id], mimeType: 'application/vnd.google-apps.document' }),
    `--${limite}`, 'Content-Type: text/plain; charset=UTF-8', '', texto, `--${limite}--`,
  ].join('\r\n')
  const r = await drive(cfg, 'upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${limite}` }, body: corpo,
  })
  const d = await r.json() as { webViewLink?: string; id: string }
  return d.webViewLink ?? `https://docs.google.com/document/d/${d.id}/edit`
}
