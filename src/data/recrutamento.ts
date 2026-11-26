// Recrutamento (etapa 1): vagas, página pública, candidatura e funil em cards. Sem IA nesta etapa.
export type Funcao = 'comercial' | 'triagem' | 'juridico' | 'suporte' | 'outra'
export type StatusVaga = 'rascunho' | 'aberta' | 'pausada' | 'encerrada'
export type Etapa = 'recebido' | 'triagem' | 'teste' | 'entrevista' | 'proposta' | 'contratado' | 'banco' | 'nao_seguiu'

export type DadosVaga = {
  funcao: Funcao; titulo: string; regime: string; modalidade: string; jornada: string; cidade: string
  salario: number | null; salarioObs: string; mostrarSalario: boolean
  beneficios: string[]; atividades: string[]; requisitos: string[]; diferenciais: string[]; perguntas: string[]
  quantidade: number; inscricoesAte: string | null
}
export type Vaga = DadosVaga & { id: string; slug: string; escritorioSlug: string | null; status: StatusVaga; total: number; novos: number; criadoEm: string }
export type VagaPublica = DadosVaga & { id: string; escritorio: string; cidadeEscritorio: string | null; aberta: boolean }
export type Candidatura = {
  id: string; nome: string; email: string; whatsapp: string; cidade: string | null; uf: string | null; linkedin: string | null
  curriculoPath: string | null; respostas: Record<string, string>; bancoTalentos: boolean; etapa: Etapa; nota: number | null; obs: string | null; criadoEm: string
  entrevista?: Entrevista | null; proposta?: Proposta | null; resposta?: Resposta | null; token?: string | null
}
export type FormCandidatura = { nome: string; email: string; whatsapp: string; cidade: string; uf: string; linkedin: string; respostas: Record<string, string>; consentimento: boolean; bancoTalentos: boolean }

export const NOMES_FUNCAO: Record<Funcao, string> = { comercial: 'Comercial e atendimento', triagem: 'Triagem de documentos', juridico: 'Jurídico', suporte: 'Suporte ao cliente e administrativo', outra: 'Outra função' }
export const NOMES_STATUS_VAGA: Record<StatusVaga, string> = { rascunho: 'Rascunho', aberta: 'Recebendo inscrições', pausada: 'Pausada', encerrada: 'Encerrada' }

export const ETAPAS: { id: Etapa; nome: string }[] = [
  { id: 'recebido', nome: 'Recebidos' }, { id: 'triagem', nome: 'Triagem' }, { id: 'teste', nome: 'Teste' },
  { id: 'entrevista', nome: 'Entrevista' }, { id: 'proposta', nome: 'Proposta' }, { id: 'contratado', nome: 'Contratado' },
  { id: 'banco', nome: 'Banco de talentos' }, { id: 'nao_seguiu', nome: 'Não seguiu' },
]
export const nomeEtapa = (e: Etapa) => ETAPAS.find((x) => x.id === e)?.nome ?? e

/** Ponto de partida por função: o gestor ajusta o que quiser. */
export const MODELOS: Record<Funcao, Pick<DadosVaga, 'titulo' | 'atividades' | 'requisitos' | 'diferenciais' | 'perguntas'>> = {
  comercial: { titulo: 'Atendente comercial',
    atividades: ['Atender os primeiros contatos pelo WhatsApp', 'Entender o caso e qualificar com o roteiro do escritório', 'Agendar a conversa com o advogado e acompanhar o retorno'],
    requisitos: ['Ensino médio completo', 'Boa escrita e simpatia no atendimento', 'Organização para acompanhar vários contatos'],
    diferenciais: ['Experiência com vendas ou atendimento por WhatsApp'], perguntas: ['Conte um atendimento difícil que você resolveu.'] },
  triagem: { titulo: 'Assistente de triagem documental',
    atividades: ['Conferir laudos, exames e documentos médicos', 'Analisar o CNIS e organizar a pasta do caso', 'Pedir ao cliente o que faltar e liberar o caso para o jurídico'],
    requisitos: ['Ensino médio completo', 'Atenção a detalhe', 'Boa escrita'],
    diferenciais: ['Experiência com documentos médicos, cartório ou escritório'], perguntas: ['Como você organiza uma tarefa com muitos documentos?'] },
  juridico: { titulo: 'Advogado(a) previdenciário(a)',
    atividades: ['Analisar casos e documentos', 'Redigir requerimentos e peças', 'Acompanhar prazos e perícias'],
    requisitos: ['OAB ativa (ou estágio em andamento, para estagiários)', 'Conhecimento de Direito Previdenciário', 'Boa redação'],
    diferenciais: ['Experiência com benefícios por incapacidade'], perguntas: ['Qual caso previdenciário você mais gostou de conduzir e por quê?'] },
  suporte: { titulo: 'Assistente de suporte ao cliente',
    atividades: ['Responder dúvidas dos clientes sobre o andamento', 'Avisar sobre perícias e pedidos de documentos', 'Manter o cadastro atualizado'],
    requisitos: ['Ensino médio completo', 'Paciência e clareza ao explicar', 'Organização'],
    diferenciais: ['Experiência com atendimento ao cliente'], perguntas: ['Como você explicaria algo complicado para alguém com pouca leitura?'] },
  outra: { titulo: '', atividades: [], requisitos: [], diferenciais: [], perguntas: [] },
}

export function vagaVazia(funcao: Funcao = 'triagem'): DadosVaga {
  const m = MODELOS[funcao]
  return { funcao, titulo: m.titulo, regime: 'CLT', modalidade: 'Remoto', jornada: 'Seg. a sex., 8h às 17h', cidade: '', salario: null, salarioObs: '', mostrarSalario: true,
    beneficios: [], atividades: [...m.atividades], requisitos: [...m.requisitos], diferenciais: [...m.diferenciais], perguntas: [...m.perguntas], quantidade: 1, inscricoesAte: null }
}

export function validarVaga(v: DadosVaga, hoje = new Date().toISOString().slice(0, 10)): string | null {
  const t = v.titulo.trim()
  if (t.length < 4 || t.length > 100) return 'O cargo precisa ter entre 4 e 100 caracteres.'
  if (v.salario !== null && (!Number.isFinite(v.salario) || v.salario < 0 || v.salario > 1_000_000)) return 'Salário inválido.'
  if (v.inscricoesAte && v.inscricoesAte < hoje) return 'A data final das inscrições já passou.'
  if (v.quantidade < 1 || v.quantidade > 50) return 'A quantidade de vagas vai de 1 a 50.'
  for (const l of [v.beneficios, v.atividades, v.requisitos, v.diferenciais, v.perguntas]) {
    if (l.length > 20) return 'Cada lista pode ter no máximo 20 itens.'
    if (l.some((x) => x.length > 300)) return 'Cada item pode ter no máximo 300 caracteres.'
  }
  return null
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export function validarCandidatura(f: FormCandidatura, perguntas: string[] = []): string | null {
  const nome = f.nome.trim()
  if (nome.length < 5 || !nome.includes(' ')) return 'Informe o nome completo.'
  if (!EMAIL.test(f.email.trim())) return 'E-mail inválido.'
  const wa = f.whatsapp.replace(/\D/g, '')
  if (wa.length < 10 || wa.length > 13) return 'WhatsApp inválido. Use DDD e número.'
  if (f.linkedin.trim() && !/^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(f.linkedin.trim())) return 'O LinkedIn precisa ser um endereço linkedin.com.'
  if (perguntas.some((_, i) => !(f.respostas[String(i)] ?? '').trim())) return 'Responda as perguntas da vaga.'
  if (Object.values(f.respostas).some((r) => r.length > 1500)) return 'Cada resposta pode ter até 1.500 caracteres.'
  if (!f.consentimento) return 'É preciso aceitar o uso dos dados para participar.'
  return null
}

export function validarCurriculo(arquivo: { type: string; size: number; name: string }): string | null {
  if (arquivo.type !== 'application/pdf' && !arquivo.name.toLowerCase().endsWith('.pdf')) return 'Envie o currículo em PDF.'
  if (arquivo.size > 5 * 1024 * 1024) return 'O currículo pode ter até 5 MB.'
  if (arquivo.size === 0) return 'O arquivo está vazio.'
  return null
}

export const salarioTela = (v: number | null) => v === null ? null : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function linkVaga(origem: string, escritorioSlug: string | null, vagaSlug: string): string | null {
  return escritorioSlug ? `${origem.replace(/\/$/, '')}/vagas/${escritorioSlug}/${vagaSlug}` : null
}

/** Texto pronto para Instagram, LinkedIn e WhatsApp. Não promete nada além do que a vaga diz. */
export function textoDivulgacao(v: Pick<Vaga, 'titulo' | 'regime' | 'modalidade' | 'cidade' | 'salario' | 'mostrarSalario' | 'beneficios' | 'inscricoesAte'>, escritorio: string, link: string): string {
  const linhas = [`Vaga: ${v.titulo} · ${escritorio}`, [v.regime, v.modalidade, v.cidade].filter(Boolean).join(' · ')]
  if (v.mostrarSalario && v.salario !== null) linhas.push(`Salário: ${salarioTela(v.salario)}`)
  if (v.beneficios.length) linhas.push(`Benefícios: ${v.beneficios.join(', ')}`)
  if (v.inscricoesAte) linhas.push(`Inscrições até ${v.inscricoesAte.split('-').reverse().join('/')}`)
  linhas.push(`Inscreva-se: ${link}`)
  return linhas.join('\n')
}

export function agruparPorEtapa(lista: Candidatura[]): Record<Etapa, Candidatura[]> {
  const r = Object.fromEntries(ETAPAS.map((e) => [e.id, [] as Candidatura[]])) as Record<Etapa, Candidatura[]>
  for (const c of lista) (r[c.etapa] ?? r.recebido).push(c)
  return r
}

export function listaDeTexto(t: string): string[] { return t.split('\n').map((x) => x.trim()).filter(Boolean) }

// ===== Entrevista e proposta =====
export type Entrevista = { modo: 'presencial' | 'video'; data: string; hora: string; duracao: number; local: string; link: string; com: string; levar: string; gravacao: boolean }
export type Proposta = { cargo: string; regime: string; salario: number | null; bonus: string; jornada: string; local: string; beneficios: string[]; inicio: string; responderAte: string; mensagem: string }
export type TipoResposta = 'confirmar' | 'outro_horario' | 'aceitar' | 'recusar'
export type Resposta = { tipo: TipoResposta; msg: string | null; em: string }
export type RespostaPublica = { nome: string; escritorio: string; vaga: string; entrevista: Entrevista | null; proposta: Proposta | null; resposta: Resposta | null; etapa: Etapa }

export const NOMES_RESPOSTA: Record<TipoResposta, string> = { confirmar: 'Confirmou a entrevista', outro_horario: 'Pediu outro horário', aceitar: 'Aceitou a proposta', recusar: 'Recusou a proposta' }

export function entrevistaVazia(): Entrevista { return { modo: 'video', data: '', hora: '', duracao: 45, local: '', link: '', com: '', levar: '', gravacao: true } }

export function validarEntrevista(e: Entrevista, hoje = new Date().toLocaleDateString('sv-SE')): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.data) || e.data < hoje) return 'Escolha uma data a partir de hoje.'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.hora)) return 'Horário inválido.'
  if (!Number.isInteger(e.duracao) || e.duracao < 10 || e.duracao > 240) return 'A duração vai de 10 a 240 minutos.'
  if (e.modo === 'presencial' && !e.local.trim()) return 'Informe o endereço da entrevista.'
  if (e.link.trim() && !/^https:\/\//i.test(e.link.trim())) return 'O link da chamada precisa começar com https://'
  return null
}

export function propostaDaVaga(v: Pick<DadosVaga, 'titulo' | 'regime' | 'salario' | 'salarioObs' | 'jornada' | 'modalidade' | 'cidade' | 'beneficios'>): Proposta {
  return { cargo: v.titulo, regime: v.regime, salario: v.salario, bonus: v.salarioObs, jornada: v.jornada, local: [v.modalidade, v.cidade].filter(Boolean).join(' · '),
    beneficios: [...v.beneficios], inicio: '', responderAte: '', mensagem: '' }
}

export function validarProposta(p: Proposta, hoje = new Date().toLocaleDateString('sv-SE')): string | null {
  if (p.cargo.trim().length < 4) return 'Informe o cargo.'
  if (p.salario === null || !Number.isFinite(p.salario) || p.salario <= 0 || p.salario > 1_000_000) return 'Informe o salário.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.inicio) || p.inicio < hoje) return 'A data de início precisa ser a partir de hoje.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.responderAte) || p.responderAte < hoje || p.responderAte > p.inicio) return 'O prazo de resposta vai de hoje até a data de início.'
  if (p.beneficios.length > 20) return 'Até 20 benefícios.'
  return null
}

const dataBr = (iso: string) => iso.split('-').reverse().join('/')
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' })

/** Mensagem pronta do convite. O gestor revisa e envia; o HiAdv não envia sozinho. */
export function textoConvite(nome: string, escritorio: string, vaga: string, e: Entrevista, link: string): string {
  const onde = e.modo === 'presencial' ? `Local: ${e.local.trim()}` : `Por vídeo${e.link.trim() ? `: ${e.link.trim()}` : ' (o link chega antes do horário)'}`
  return [`Olá, ${nome.split(' ')[0]}! Aqui é do ${escritorio}.`, `Queremos conversar com você sobre a vaga de ${vaga}.`,
    `Quando: ${diaSemana(e.data)}, ${dataBr(e.data)} às ${e.hora} (${e.duracao} min)`, onde,
    e.com.trim() ? `Com: ${e.com.trim()}` : '', e.modo === 'presencial' && e.levar.trim() ? `Levar: ${e.levar.trim()}` : '',
    e.modo === 'video' && e.gravacao ? 'Se você concordar, a conversa é gravada e transcrita só para a avaliação desta vaga.' : '',
    `Confirme ou peça outro horário por aqui: ${link}`].filter(Boolean).join('\n')
}

export function textoProposta(nome: string, escritorio: string, p: Proposta, link: string): string {
  return [`Olá, ${nome.split(' ')[0]}! Temos uma proposta do ${escritorio} para você.`, `Cargo: ${p.cargo.trim()} (${p.regime})`,
    `Salário: ${salarioTela(p.salario)}${p.bonus.trim() ? ` ${p.bonus.trim()}` : ''}`, p.jornada.trim() ? `Jornada: ${p.jornada.trim()}` : '',
    p.beneficios.length ? `Benefícios: ${p.beneficios.join(', ')}` : '', `Início: ${dataBr(p.inicio)}${p.local.trim() ? ` · ${p.local.trim()}` : ''}`,
    p.mensagem.trim(), `Veja os detalhes e responda até ${dataBr(p.responderAte)}: ${link}`].filter(Boolean).join('\n')
}

export const linkResposta = (origem: string, token: string) => `${origem.replace(/\/$/, '')}/resposta/${token}`
