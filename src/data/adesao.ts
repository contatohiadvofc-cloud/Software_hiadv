// Adesão ao HiAdv: questionário curto, plano recomendado e pedido. Também as indicações com cortesia.
export type PlanoId = 'pro' | 'premium' | 'supremo'
export type Respostas = { atuacao?: string; processos?: string; oabs?: string; areas?: string[]; prioridades?: string[] }

export type Pergunta = { id: keyof Respostas; titulo: string; dica?: string; multipla?: boolean; max?: number; opcoes: { valor: string; rotulo: string }[] }

export const PERGUNTAS: Pergunta[] = [
  { id: 'atuacao', titulo: 'Como você trabalha hoje?', opcoes: [
    { valor: 'sozinho', rotulo: 'Sozinho(a)' },
    { valor: 'dupla', rotulo: 'Com 1 assistente ou sócio' },
    { valor: 'equipe', rotulo: 'Com equipe de 3 a 10 pessoas' },
    { valor: 'grande', rotulo: 'Com mais de 10 pessoas' },
  ] },
  { id: 'processos', titulo: 'Quantos processos ativos, mais ou menos?', opcoes: [
    { valor: 'ate100', rotulo: 'Até 100' },
    { valor: '100a500', rotulo: 'De 100 a 500' },
    { valor: '500mais', rotulo: 'Mais de 500' },
  ] },
  { id: 'oabs', titulo: 'Quantas OABs o escritório precisa acompanhar nas publicações?', opcoes: [
    { valor: '1', rotulo: 'Uma' },
    { valor: '2a3', rotulo: 'Duas ou três' },
    { valor: '4mais', rotulo: 'Quatro ou mais' },
  ] },
  { id: 'areas', titulo: 'Em quais áreas você atua?', dica: 'Pode marcar mais de uma.', multipla: true, opcoes: [
    { valor: 'previdenciario', rotulo: 'Previdenciário' }, { valor: 'trabalhista', rotulo: 'Trabalhista' },
    { valor: 'civel', rotulo: 'Cível' }, { valor: 'familia', rotulo: 'Família' },
    { valor: 'bancario', rotulo: 'Bancário' }, { valor: 'criminal', rotulo: 'Criminal' },
    { valor: 'tributario', rotulo: 'Tributário' }, { valor: 'outra', rotulo: 'Outra' },
  ] },
  { id: 'prioridades', titulo: 'O que mais pesa no seu dia hoje?', dica: 'Escolha até três.', multipla: true, max: 3, opcoes: [
    { valor: 'prazos', rotulo: 'Não perder prazos e intimações' },
    { valor: 'organizar', rotulo: 'Organizar casos e documentos' },
    { valor: 'contatos', rotulo: 'Responder e converter novos contatos' },
    { valor: 'cliente', rotulo: 'Manter o cliente informado' },
    { valor: 'financeiro', rotulo: 'Controlar financeiro e honorários' },
    { valor: 'equipe', rotulo: 'Acompanhar a produtividade da equipe' },
    { valor: 'ia', rotulo: 'Usar IA para peças e documentos' },
  ] },
]

export type Plano = { id: PlanoId; nome: string; preco: number; fundador: number; resumo: string; limites: string; destaques: string[]; emBreve?: boolean }

export const PLANOS: Plano[] = [
  { id: 'pro', nome: 'Júnior', preco: 109.9, fundador: 109.9, resumo: 'Para o advogado autônomo, com ou sem um assistente.', limites: '1 acesso Master, 1 colaborador e 1 OAB acompanhada',
    destaques: ['Casos por área, em etapas', 'Prazos com feriados dos tribunais', 'Publicações e andamentos pela OAB', 'Atendimentos, do contato até virar cliente', 'Link de acompanhamento para o cliente'] },
  { id: 'premium', nome: 'Pleno', preco: 189.9, fundador: 169.9, resumo: 'Para o escritório com equipe e financeiro.', limites: 'Até 3 acessos Master, 8 colaboradores e 3 OABs',
    destaques: ['Tudo do Júnior', 'Financeiro e honorários', 'Relatórios e produtividade da equipe', 'Horas trabalhadas', 'Avisos e rodízio de responsáveis'] },
  { id: 'supremo', nome: 'Sênior', preco: 297, fundador: 200, resumo: 'Tudo do HiAdv, com IA e leitura no seu Google Drive.', limites: 'Até 5 acessos Master, 20 colaboradores e 10 OABs', emBreve: true,
    destaques: ['Tudo do Pleno', 'IA para minutas, quesitos e leitura de intimações', 'Leitura e organização no seu Google Drive', 'Assinatura digital e WhatsApp oficial', 'Implantação assistida'] },
]
export const plano = (id: PlanoId) => PLANOS.find((p) => p.id === id)!

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const preco = (v: number) => BRL.format(v)

/** Recomendação simples e explicada. Sênior vem com "comece pelo Pleno" enquanto não é liberado. */
export function recomendar(r: Respostas): { plano: PlanoId; motivos: string[]; comecarCom: PlanoId | null } {
  const pr = r.prioridades ?? []
  const motivos: string[] = []
  const temEquipe = r.atuacao === 'equipe' || r.atuacao === 'grande'
  if (pr.includes('ia')) {
    motivos.push('Você quer usar IA nas peças e documentos, que é o centro do Sênior.')
    if (temEquipe) motivos.push('Com equipe, o financeiro e os relatórios do Pleno já ajudam desde o primeiro dia.')
    return { plano: 'supremo', motivos, comecarCom: temEquipe || pr.includes('financeiro') ? 'premium' : 'pro' }
  }
  if (temEquipe) motivos.push('Com equipe, você acompanha quem faz o quê e a carga de cada pessoa.')
  if (r.oabs && r.oabs !== '1') motivos.push('O Pleno acompanha até 3 OABs nas publicações.')
  if (pr.includes('financeiro')) motivos.push('Financeiro e honorários estão no Pleno.')
  if (pr.includes('equipe')) motivos.push('Produtividade da equipe está no Pleno.')
  if (motivos.length) {
    if (r.atuacao === 'grande' || r.oabs === '4mais') motivos.push('Acessos ou OABs além do limite entram como adicional.')
    return { plano: 'premium', motivos, comecarCom: null }
  }
  if (pr.includes('prazos') || !pr.length) motivos.push('Prazos, publicações e intimações já vêm no Júnior.')
  if (pr.includes('contatos')) motivos.push('Os atendimentos, do contato até virar cliente, já vêm no Júnior.')
  if (pr.includes('cliente')) motivos.push('O link de acompanhamento para o cliente já vem no Júnior.')
  if (pr.includes('organizar')) motivos.push('Casos por área e documentos a partir de modelos já vêm no Júnior.')
  return { plano: 'pro', motivos, comecarCom: null }
}

export type FormAdesao = { nome: string; email: string; whatsapp: string; oab: string; escritorio: string; cidade: string; uf: string; consentimento: boolean }

export function validarAdesao(f: FormAdesao): string | null {
  if (f.nome.trim().length < 2) return 'Informe o seu nome.'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return 'E-mail inválido.'
  const w = f.whatsapp.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (!/^\d{10,11}$/.test(w)) return 'WhatsApp com DDD e número.'
  if (f.uf && !/^[A-Za-z]{2}$/.test(f.uf.trim())) return 'UF com duas letras.'
  if (!f.consentimento) return 'Marque que concorda com o uso dos dados para o contato.'
  return null
}

export function respostasCompletas(r: Respostas): boolean {
  return PERGUNTAS.every((p) => (p.multipla ? (r[p.id] as string[] | undefined)?.length : r[p.id]))
}

/** Marca ou desmarca uma opção, respeitando o máximo. */
export function alternar(lista: string[] | undefined, valor: string, max?: number): string[] {
  const l = lista ?? []
  if (l.includes(valor)) return l.filter((x) => x !== valor)
  if (max && l.length >= max) return l
  return [...l, valor]
}

// ---------- Indicações ----------
export const REGRA_CORTESIA = 'A cada escritório que aderir pelo seu link e pagar a primeira mensalidade, o seu escritório ganha 1 mês grátis, até 12 meses por ano.'
export const WHATSAPP_HIADV = '49999730572'

export function codigoValido(c: string): boolean {
  return /^[A-Z2-9]{7}$/.test(c.trim().toUpperCase())
}

export function linkIndicacao(origem: string, codigo: string, hash = false): string {
  return `${origem.replace(/\/$/, '')}/${hash ? '#/' : ''}aderir?ref=${codigo}`
}

export function mensagemIndicacao(link: string): string {
  return `Uso o HiAdv no escritório para prazos, publicações, atendimentos e acompanhamento dos clientes. Se quiser conhecer, responda 5 perguntas e veja o plano que combina com você: ${link}`
}

export type Indicacao = { id: string; primeiroNome: string; plano: PlanoId; status: StatusAdesao; cortesia: Cortesia; criadoEm: string; quem: string | null; minha: boolean }
export type StatusAdesao = 'nova' | 'em_contato' | 'ativada' | 'recusada'
export type Cortesia = 'nenhuma' | 'pendente' | 'aplicada'
export const NOMES_STATUS: Record<StatusAdesao, string> = { nova: 'Pedido recebido', em_contato: 'Em contato', ativada: 'Ativado', recusada: 'Não seguiu' }
export const NOMES_CORTESIA: Record<Cortesia, string> = { nenhuma: '', pendente: '1 mês grátis a aplicar', aplicada: '1 mês grátis aplicado' }

export function resumoIndicacoes(l: Pick<Indicacao, 'status' | 'cortesia'>[]): { total: number; ativadas: number; meses: number } {
  return { total: l.length, ativadas: l.filter((x) => x.status === 'ativada').length, meses: l.filter((x) => x.cortesia !== 'nenhuma').length }
}

export type Adesao = {
  id: string; nome: string; email: string; whatsapp: string; oab: string | null; escritorio: string | null; cidade: string | null; uf: string | null
  plano: PlanoId; recomendado: PlanoId | null; respostas: Respostas; indicadorEmail: string | null; indicadorEscritorio: string | null
  status: StatusAdesao; fundador: boolean; cortesia: Cortesia; obs: string | null; criadoEm: string
}
