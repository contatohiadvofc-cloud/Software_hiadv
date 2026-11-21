/** Áreas de atuação que o HiAdv oferece; cada uma já vem com as etapas prontas no servidor. */
export const CATALOGO_AREAS: { area: string; nome: string; exemplo: string }[] = [
  { area: 'administrativo', nome: 'Previdenciário administrativo', exemplo: 'Requerimentos no INSS, exigências e recursos ao CRPS' },
  { area: 'judicial', nome: 'Previdenciário judicial', exemplo: 'Ações contra o INSS, perícia e cumprimento de sentença' },
  { area: 'trabalhista', nome: 'Trabalhista', exemplo: 'Reclamações trabalhistas, audiências e acordos' },
  { area: 'civel', nome: 'Cível', exemplo: 'Cobranças, indenizações, família, contratos' },
  { area: 'bancario', nome: 'Bancário', exemplo: 'Consignados, juros abusivos, revisões de contrato' },
  { area: 'penal', nome: 'Penal', exemplo: 'Defesas criminais, inquéritos e audiências' },
  { area: 'extrajudicial', nome: 'Extrajudicial', exemplo: 'Acordos, notificações, inventários em cartório' },
]

export const nomeDaArea = (area: string) => CATALOGO_AREAS.find((a) => a.area === area)?.nome ?? area

/** Áreas do catálogo que ainda não estão ligadas no escritório. */
export function areasParaLigar(ativas: { area: string }[]): typeof CATALOGO_AREAS {
  const ligadas = new Set(ativas.map((a) => a.area))
  return CATALOGO_AREAS.filter((a) => !ligadas.has(a.area))
}
