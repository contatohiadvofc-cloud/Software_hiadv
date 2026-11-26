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

/** Endereço do app Meu Processo do cliente (o token só existe neste link). Na prévia, o acompanhamento antigo. */
export function linkPortal(origem: string, token: string, hash = false): string {
  return hash ? `${origem.replace(/\/$/, '')}/#/acompanhar/${token}` : `${origem.replace(/\/$/, '')}/mp/${token}`
}

export function mensagemPortal(primeiroNome: string, escritorio: string, link: string): string {
  const nome = primeiroNome.trim().split(/\s+/)[0] || ''
  return `Olá${nome ? `, ${nome}` : ''}! Aqui é do ${escritorio}. Pelo app Meu Processo você acompanha o seu caso, vê as novidades e conversa com a equipe, a qualquer hora: ${link}\n\nAo abrir, toque em Instalar para ter o ícone no celular. O link é pessoal, não compartilhe.`
}

export function validarToken(t: string): boolean {
  return /^[0-9a-f]{64}$/.test(t)
}
