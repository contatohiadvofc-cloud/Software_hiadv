export type PortalCaso = { area: string; fase: string; desde: string | null; concluido: boolean }
export type PortalCompromisso = { tipo: string; quando: string; local: string | null }
export type Portal = {
  escritorio: { nome: string; whatsapp: string | null }
  cliente: string
  casos: PortalCaso[]
  compromissos: PortalCompromisso[]
  expiraEm: string
}
export type SituacaoPortal = { ativo: boolean; expiraEm: string | null; acessos: number; ultimoAcesso: string | null }

/** Endereço público do acompanhamento (o token só existe neste link). */
export function linkPortal(origem: string, token: string, hash = false): string {
  return `${origem.replace(/\/$/, '')}/${hash ? '#/' : ''}acompanhar/${token}`
}

export function mensagemPortal(primeiroNome: string, escritorio: string, link: string): string {
  const nome = primeiroNome.trim().split(/\s+/)[0] || ''
  return `Olá${nome ? `, ${nome}` : ''}! Aqui é do ${escritorio}. Por este link você acompanha o andamento do seu caso, a qualquer hora: ${link}\n\nO link é pessoal, não compartilhe.`
}

export function validarToken(t: string): boolean {
  return /^[0-9a-f]{64}$/.test(t)
}
