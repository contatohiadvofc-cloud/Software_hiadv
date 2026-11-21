/**
 * Desbloqueio pelo celular (digital, rosto ou a senha de tela do aparelho).
 *
 * Funciona como trava local do app: depois do primeiro login com e-mail e senha, a sessão fica
 * guardada no aparelho e, ao abrir o HiAdv de novo, o aparelho confirma que é o dono (WebAuthn com
 * verificação do usuário). Nada de biometria sai do aparelho; o servidor continua exigindo a
 * sessão normal. Se a sessão terminar, volta a pedir e-mail e senha.
 */
const CHAVE = 'hiadv-desbloqueio'
const LIBERADO = 'hiadv-desbloqueado'
const DISPENSADO = 'hiadv-desbloqueio-dispensado'

type Registro = { id: string; email: string }

const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n))

function ler<T>(armazem: Storage | undefined, chave: string): T | null {
  try { const v = armazem?.getItem(chave); return v ? (JSON.parse(v) as T) : null } catch { return null }
}
function gravar(armazem: Storage | undefined, chave: string, v: unknown | null) {
  try { if (v === null) armazem?.removeItem(chave); else armazem?.setItem(chave, JSON.stringify(v)) } catch { /* modo privado */ }
}
const local = () => (typeof localStorage === 'undefined' ? undefined : localStorage)
const sessao = () => (typeof sessionStorage === 'undefined' ? undefined : sessionStorage)

/** O aparelho tem trava própria (digital, rosto ou senha de tela) que o navegador consegue usar? */
export async function suportado(): Promise<boolean> {
  try {
    const P = (globalThis as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }).PublicKeyCredential
    if (!P?.isUserVerifyingPlatformAuthenticatorAvailable || !globalThis.isSecureContext) return false
    return await P.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

export function registro(): Registro | null { return ler<Registro>(local(), CHAVE) }
export function ativoPara(email: string | null | undefined): boolean {
  const r = registro(); return !!r && !!email && r.email === email.toLowerCase()
}
export function liberadoNestaAbertura(): boolean { return ler<boolean>(sessao(), LIBERADO) === true }
export function marcarLiberado() { gravar(sessao(), LIBERADO, true) }
export function dispensado(): boolean { return ler<boolean>(local(), DISPENSADO) === true }
export function dispensar() { gravar(local(), DISPENSADO, true) }
export function desligar() { gravar(local(), CHAVE, null) }

/** Precisa mostrar a tela de desbloqueio antes do app? */
export function precisaDesbloquear(email: string | null | undefined): boolean {
  return ativoPara(email) && !liberadoNestaAbertura()
}

/** Cria a credencial no aparelho. O aparelho pede a digital, o rosto ou a senha de tela. */
export async function ativar(email: string, nome: string): Promise<void> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: aleatorio(32),
      rp: { name: 'HiAdv' },
      user: { id: aleatorio(16), name: email, displayName: nome || email },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('O aparelho não confirmou.')
  gravar(local(), CHAVE, { id: b64(cred.rawId), email: email.toLowerCase() } satisfies Registro)
  gravar(local(), DISPENSADO, null)
  marcarLiberado()
}

/** Pede ao aparelho para confirmar o dono. Devolve true se confirmou. */
export async function desbloquear(): Promise<boolean> {
  const r = registro()
  if (!r) return false
  try {
    const ok = await navigator.credentials.get({
      publicKey: { challenge: aleatorio(32), allowCredentials: [{ type: 'public-key', id: deB64(r.id) }], userVerification: 'required', timeout: 60_000 },
    })
    if (!ok) return false
    marcarLiberado()
    return true
  } catch { return false }
}

/** Aparelho de toque (celular ou tablet): é onde a oferta faz sentido. */
export function aparelhoDeToque(): boolean {
  try { return matchMedia('(pointer: coarse)').matches } catch { return false }
}
