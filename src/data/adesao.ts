// Adesão ao HiAdv: questionário curto, plano recomendado e pedido. Também as indicações com cortesia.
export type PlanoId = 'pro' | 'premium' | 'senior' | 'supremo'
export type Respostas = { atuacao?: string; processos?: string; oabs?: string; areas?: string[]; prioridades?: string[]; implantacao?: 'assistida' | 'sozinho' }

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

export type Plano = { id: PlanoId; nome: string; preco: number; fundador: number; resumo: string; limites: string; destaques: string[]; emBreve?: boolean; aPartirDe?: boolean
  /** Acessos: gestores, colaboradores e o total que o plano permite (Júnior: 2 no total, em qualquer combinação). */
  acessos: { gestores: number; colaboradores: number; total: number }
}

export const PLANOS: Plano[] = [
  { id: 'pro', nome: 'Júnior', preco: 119.9, fundador: 119.9, resumo: 'Para o advogado autônomo, com ou sem um assistente.', limites: '2 acessos (2 gestores, ou 1 gestor e 1 colaborador) e 1 OAB acompanhada',
    acessos: { gestores: 2, colaboradores: 1, total: 2 },
    destaques: ['Casos por área, em etapas, com o que falta para avançar', 'Prazos com feriados dos tribunais', 'Publicações pela OAB e Escavador ou JUDIT conectados', 'Atendimentos, do contato até virar cliente', 'App Meu Processo para o cliente acompanhar o caso', 'Conversas da equipe: chat, áudio, chamadas e grupos'] },
  { id: 'premium', nome: 'Pleno', preco: 197.9, fundador: 197.9, resumo: 'Para o escritório com equipe e financeiro.', limites: '3 gestores, 6 colaboradores e 3 OABs',
    acessos: { gestores: 3, colaboradores: 6, total: 9 },
    destaques: ['Tudo do Júnior', 'Financeiro, honorários e cobrança pelo Asaas', 'Calculadoras de cada área, inclusive Bancário', 'Assinatura digital (ZapSign, Clicksign ou D4Sign)', 'Relatórios, horas e rodízio da equipe', 'Recrutamento: vagas, inscrições, entrevista e proposta'] },
  { id: 'senior', nome: 'Sênior', preco: 397.5, fundador: 397.5, resumo: 'Para escritórios maiores, com a IA que o próprio escritório já usa conectada ao HiAdv.', limites: '5 gestores, 8 colaboradores e 10 OABs',
    acessos: { gestores: 5, colaboradores: 8, total: 13 },
    destaques: ['Tudo do Pleno', 'IA própria: o escritório conecta a chave da IA que já usa e trabalha com os agentes dentro do HiAdv', 'Minutas e resumos para revisão do advogado, a partir dos dados do caso', 'Google Drive do escritório com identificador e leitor de documentos', 'WhatsApp oficial e API incluídos quando forem lançados'] },
  { id: 'supremo', nome: 'Master', preco: 524.5, fundador: 524.5, aPartirDe: true, resumo: 'O plano completo: a Sara Integrada, a IA do HiAdv, já ligada, e acessos sob medida para a equipe.', limites: 'A partir de 5 gestores e 8 colaboradores, com acessos extras sob medida; 300 usos de IA por mês incluídos', emBreve: true,
    acessos: { gestores: 5, colaboradores: 8, total: 13 },
    destaques: ['Tudo do Sênior', 'Sara Integrada: a IA do HiAdv, sem contratar nem configurar chave', 'Sara executando as ações pedidas pela equipe, com registro', 'Acessos personalizados: mais gestores e colaboradores, com custo por acesso extra', 'Combo sob medida com a implantação assistida', 'Leitura de intimações e laudos com resumo do que fazer'] },
]

/** Quantas pessoas cabem numa chamada de voz ou vídeo: o total de acessos do plano (no Master, o contratado). */
export function limiteChamada(plano: PlanoId | null | undefined, contratado?: number | null): number {
  if (!plano) return 13
  if (plano === 'supremo' && contratado && contratado > 0) return contratado
  return PLANOS.find((p) => p.id === plano)!.acessos.total
}

/** Preço como aparece no site: "a partir de" no Master. */
export const precoTela = (p: Plano, brl: (v: number) => string) => (p.aPartirDe ? `a partir de ${brl(p.preco)}` : brl(p.preco))
export const plano = (id: PlanoId) => PLANOS.find((p) => p.id === id)!

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const preco = (v: number) => BRL.format(v)

/** Recomendação simples e explicada. Sênior vem com "comece pelo Pleno" enquanto não é liberado. */
export function recomendar(r: Respostas): { plano: PlanoId; motivos: string[]; comecarCom: PlanoId | null } {
  const pr = r.prioridades ?? []
  const motivos: string[] = []
  const temEquipe = r.atuacao === 'equipe' || r.atuacao === 'grande'
  if (pr.includes('ia')) {
    motivos.push('Você quer usar IA nas peças e documentos: no Sênior, o escritório conecta a IA que já usa e trabalha com os agentes dentro do HiAdv.')
    if (temEquipe) motivos.push('Com equipe, o financeiro e os relatórios já vêm junto.')
    if (r.atuacao === 'grande') motivos.push('Para a Sara Integrada e acessos sob medida, o plano Master está chegando; você pode entrar na lista.')
    return { plano: 'senior', motivos, comecarCom: null }
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
  if (pr.includes('cliente')) motivos.push('O app Meu Processo, para o cliente acompanhar o caso, já vem no Júnior.')
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
export const REGRA_CORTESIA = 'Cada escritório que aderir pelo seu link e pagar a primeira mensalidade vale 20% de desconto em uma mensalidade do seu escritório. Os descontos somam mês a mês: quem indica 3 tem 3 mensalidades com 20% de desconto, até 12 por ano.'
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
export const NOMES_CORTESIA: Record<Cortesia, string> = { nenhuma: '', pendente: '20% de desconto a aplicar', aplicada: '20% de desconto aplicado' }

export function resumoIndicacoes(l: Pick<Indicacao, 'status' | 'cortesia'>[]): { total: number; ativadas: number; meses: number } {
  return { total: l.length, ativadas: l.filter((x) => x.status === 'ativada').length, meses: l.filter((x) => x.cortesia !== 'nenhuma').length }
}

export type Adesao = {
  id: string; nome: string; email: string; whatsapp: string; oab: string | null; escritorio: string | null; cidade: string | null; uf: string | null
  plano: PlanoId; recomendado: PlanoId | null; respostas: Respostas; indicadorEmail: string | null; indicadorEscritorio: string | null
  status: StatusAdesao; fundador: boolean; cortesia: Cortesia; obs: string | null; criadoEm: string
}

/** Implantação assistida: 6 semanas com o Deividy aplicando, integrando, ativando e treinando a equipe. Opcional; quem preferir implanta sozinho pelo Manual. */
export const IMPLANTACAO = {
  valor: 8000,
  pagamento: 'Dinheiro, cartão de débito, Pix, até 10x no cartão de crédito ou 3x no boleto',
  semanas: [
    { titulo: 'Semana 1 · Diagnóstico e base', itens: ['Reunião de diagnóstico com os gestores: áreas, funções, fluxo atual e metas', 'Dados do escritório, logo, OABs e equipe cadastrados; papéis e acessos de cada pessoa', 'Treino 1: navegação, Seu dia, busca global, atalhos e aplicativo no celular (Android e iPhone)'] },
    { titulo: 'Semana 2 · Fluxos e áreas', itens: ['Áreas, etapas e modelos de caso montados por tipo de benefício ou ação', 'Campos personalizados, checklists de entrada e saída e responsáveis por área', 'Treino 2: casos, tarefas, passagem de bastão e prazos com feriados'] },
    { titulo: 'Semana 3 · Migração dos dados', itens: ['Importação de clientes, casos e prazos da planilha ou do sistema anterior, com conferência', 'Publicações pela OAB ligadas e conferidas com o escritório', 'Treino 3: clientes, documentos, agenda e link de acompanhamento do cliente'] },
    { titulo: 'Semana 4 · Integrações', itens: ['Conexões ativadas conforme o plano: cobrança, assinatura digital, Google Drive, consulta processual', 'Financeiro e honorários configurados com as regras do escritório', 'Treino 4: financeiro, relatórios e conversas e chamadas da equipe'] },
    { titulo: 'Semana 5 · Automações e Sara', itens: ['Automações do escritório montadas e simuladas antes de ligar', 'Sara configurada com os limites definidos pelos gestores', 'Treino 5: automações, Sara, recrutamento e atendimentos (do contato ao cliente)'] },
    { titulo: 'Semana 6 · Rodagem assistida e entrega', itens: ['Uma semana usando no dia a dia com acompanhamento e ajustes finos', 'Revisão de acessos, segurança e cópias de segurança', 'Treino 6: dúvidas finais, gestor sênior e entrega do roteiro do escritório'] },
  ],
} as const
