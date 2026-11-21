/** Mesma regra do servidor: sem espaços nas pontas e acentos unificados (evita "senha errada" sem motivo). */
export function normSenha(v: string): string { return String(v ?? '').normalize('NFC').trim() }

export type RegrasSenha = { tamanho: boolean; letra: boolean; numero: boolean; confere: boolean; diferenteDaMestra: boolean }

export function regrasSenha(nova: string, confirmar: string, mestra: string): RegrasSenha {
  const a = normSenha(nova)
  return {
    tamanho: a.length >= 8,
    letra: /[A-Za-zÀ-ÿ]/.test(a),
    numero: /[0-9]/.test(a),
    confere: !!a && a === normSenha(confirmar),
    diferenteDaMestra: !!a && a !== normSenha(mestra),
  }
}

export const senhaPronta = (r: RegrasSenha) => Object.values(r).every(Boolean)

export const TEXTO_REGRAS: Record<keyof RegrasSenha, string> = {
  tamanho: 'Pelo menos 8 caracteres',
  letra: 'Pelo menos uma letra',
  numero: 'Pelo menos um número',
  confere: 'As duas digitações iguais',
  diferenteDaMestra: 'Diferente da senha mestra',
}

/** Mensagem para cada resposta do servidor de login da equipe. */
export function mensagemLogin(motivo: string | undefined, restam?: number | null): string {
  const resto = restam && restam > 0 ? ` Restam ${restam} ${restam === 1 ? 'tentativa' : 'tentativas'} antes do bloqueio de 15 minutos.` : ''
  if (motivo === 'senha') return `E-mail ou senha incorretos.${resto}`
  if (motivo === 'mestra') return `Senha mestra incorreta, ou e-mail fora da equipe.${resto}`
  if (motivo === 'gestor') return 'Esta é uma conta de gestor: use a senha mestra de gestor.'
  if (motivo === 'bloqueado') return 'Muitas tentativas erradas. Aguarde 15 minutos ou peça ao gestor para desbloquear.'
  if (motivo === 'fraca') return 'Escolha uma senha mais forte.'
  return 'Não foi possível entrar agora. Tente de novo em instantes.'
}
