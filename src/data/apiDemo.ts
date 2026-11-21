import type { Api, Area, Escritorio, Perfil } from './api'
import { CredencialInvalida } from './api'
import { diaSP, type ItemDia } from './seuDia'
import { destaquesDoCartao, type CasoCard, type Etapa } from './quadro'
import type { EventoHistorico, Ficha } from './ficha'
import { telaParaValor, validarCampo, type CampoDef } from './campos'
import type { Pessoa, Tarefa } from './tarefas'

/** Modo demonstração: tudo fictício, sem servidor. Senha de qualquer conta: "demo". */
const ESCRITORIOS: Escritorio[] = [
  { id: 'demo-sp', nome: 'Silva & Prado Advocacia', atual: true },
  { id: 'demo-tb', nome: 'Escritório Trabalhista Exemplo', atual: false },
]
const AREAS: Record<string, Area[]> = {
  'demo-sp': [
    { area: 'trabalhista', nome: 'Trabalhista', ordem: 10 },
    { area: 'administrativo', nome: 'Previdenciário administrativo', ordem: 20 },
    { area: 'judicial', nome: 'Previdenciário judicial', ordem: 30 },
  ],
  'demo-tb': [{ area: 'trabalhista', nome: 'Trabalhista', ordem: 10 }],
}

const ETAPAS: Record<string, Etapa[]> = {
  trabalhista: [
    { status: 'pendente', ordem: 1, final: false, pedeMotivo: false }, { status: 'ag. documentação', ordem: 2, final: false, pedeMotivo: false },
    { status: 'fazendo inicial', ordem: 3, final: false, pedeMotivo: false }, { status: 'ag. revisão', ordem: 4, final: false, pedeMotivo: false },
    { status: 'protocolado', ordem: 5, final: false, pedeMotivo: false }, { status: 'ag. audiência', ordem: 6, final: false, pedeMotivo: false },
    { status: 'recorrer', ordem: 7, final: false, pedeMotivo: false }, { status: 'em pagamento', ordem: 8, final: false, pedeMotivo: false },
    { status: 'improcedente', ordem: 9, final: true, pedeMotivo: true }, { status: 'decisão positiva', ordem: 12, final: true, pedeMotivo: false },
  ],
  administrativo: [
    { status: 'novo cliente', ordem: 1, final: false, pedeMotivo: false }, { status: 'ag. docs do(a) cliente', ordem: 2, final: false, pedeMotivo: false },
    { status: 'fazendo req adm', ordem: 6, final: false, pedeMotivo: false }, { status: 'protocolado', ordem: 8, final: false, pedeMotivo: false },
    { status: 'ag. perícia', ordem: 10, final: false, pedeMotivo: false }, { status: 'inviável', ordem: 12, final: true, pedeMotivo: true },
  ],
  judicial: [
    { status: 'pendente', ordem: 1, final: false, pedeMotivo: false }, { status: 'fazendo inicial', ordem: 3, final: false, pedeMotivo: false },
    { status: 'protocolado', ordem: 5, final: false, pedeMotivo: false }, { status: 'ag. perícia', ordem: 6, final: false, pedeMotivo: false },
    { status: 'impugnar laudo', ordem: 8, final: false, pedeMotivo: false }, { status: 'ag. julgamento', ordem: 9, final: false, pedeMotivo: false },
  ],
}
const CASOS: CasoCard[] = [
  { id: 'k1', cliente: 'Bruno Teixeira', status: 'protocolado', dias: 12, produto: 'Reclamação trabalhista', numeroCnj: null, gateOk: 4, gateTotal: 5 },
  { id: 'k2', cliente: 'Carla Mendes', status: 'ag. documentação', dias: 19, produto: 'Reclamação trabalhista', numeroCnj: null, gateOk: 2, gateTotal: 5 },
  { id: 'k3', cliente: 'Ana Ribeiro', status: 'ag. audiência', dias: 4, produto: 'Reclamação trabalhista', numeroCnj: null, gateOk: 5, gateTotal: 5 },
  { id: 'k4', cliente: 'Diego Alves', status: 'recorrer', dias: 2, produto: 'Recurso ordinário', numeroCnj: null, gateOk: 5, gateTotal: 5 },
  { id: 'k5', cliente: 'Lúcia Farias', status: 'fazendo inicial', dias: 6, produto: 'Reclamação trabalhista', numeroCnj: null, gateOk: 3, gateTotal: 5 },
  { id: 'k6', cliente: 'Rita Moura', status: 'ag. perícia', dias: 9, produto: 'Auxílio-acidente', numeroCnj: null, gateOk: 6, gateTotal: 6 },
  { id: 'k7', cliente: 'Paula Nunes', status: 'ag. docs do(a) cliente', dias: 22, produto: 'Auxílio-doença', numeroCnj: null, gateOk: 1, gateTotal: 6 },
  { id: 'k8', cliente: 'José Lima', status: 'impugnar laudo', dias: 3, produto: 'Auxílio-acidente', numeroCnj: null, gateOk: 6, gateTotal: 6 },
]
const AREA_DO_CASO: Record<string, string> = { k1: 'trabalhista', k2: 'trabalhista', k3: 'trabalhista', k4: 'trabalhista', k5: 'trabalhista', k6: 'administrativo', k7: 'administrativo', k8: 'judicial' }

const MOTIVOS = ['Dispensa sem justa causa', 'Pedido de demissão', 'Justa causa', 'Rescisão indireta', 'Acordo (art. 484-A)', 'Término de contrato', 'Ainda trabalha']
const DEFS: Record<string, CampoDef[]> = {
  trabalhista: [
    { chave: 'reclamadas', rotulo: 'Reclamada(s)', tipo: 'texto', opcoes: null, ordem: 10, noCartao: true },
    { chave: 'funcao', rotulo: 'Função', tipo: 'texto', opcoes: null, ordem: 20, noCartao: false },
    { chave: 'admissao', rotulo: 'Admissão', tipo: 'data', opcoes: null, ordem: 30, noCartao: false },
    { chave: 'saida', rotulo: 'Saída', tipo: 'data', opcoes: null, ordem: 40, noCartao: false },
    { chave: 'salario', rotulo: 'Último salário', tipo: 'moeda', opcoes: null, ordem: 50, noCartao: false },
    { chave: 'motivo_saida', rotulo: 'Motivo da saída', tipo: 'lista', opcoes: MOTIVOS, ordem: 60, noCartao: false },
    { chave: 'verbas', rotulo: 'Verbas pedidas', tipo: 'texto_longo', opcoes: null, ordem: 70, noCartao: false },
    { chave: 'valor_causa', rotulo: 'Valor da causa', tipo: 'moeda', opcoes: null, ordem: 80, noCartao: false },
    { chave: 'vara', rotulo: 'Vara / TRT', tipo: 'texto', opcoes: null, ordem: 90, noCartao: true },
    { chave: 'aud_inicial', rotulo: 'Audiência inicial', tipo: 'data', opcoes: null, ordem: 100, noCartao: false },
    { chave: 'aud_instrucao', rotulo: 'Audiência de instrução', tipo: 'data', opcoes: null, ordem: 110, noCartao: false },
    { chave: 'fase', rotulo: 'Fase', tipo: 'lista', opcoes: ['Conhecimento', 'Recurso', 'Execução', 'Acordo em cumprimento'], ordem: 120, noCartao: true },
  ],
}
const CAMPOS: Record<string, Record<string, unknown>> = {
  k1: { reclamadas: 'Metalúrgica Alfa Ltda.', funcao: 'Soldador', admissao: '2019-03-01', saida: '2025-08-15', salario: 3150, motivo_saida: 'Dispensa sem justa causa', vara: '2ª Vara do Trabalho de Exemplo', fase: 'Conhecimento' },
  k3: { reclamadas: 'Transportes Sul S.A.', funcao: 'Motorista', fase: 'Conhecimento' },
}
const HIST: Record<string, EventoHistorico[]> = {}
const CHECK = ['Procuração assinada', 'Documento com foto', 'CTPS digital', 'Holerites', 'Termo de rescisão', 'Laudos e exames', 'CNIS']

const EQUIPE: Pessoa[] = [
  { email: 'ana@silvaprado.exemplo.br', nome: 'Ana Prado' }, { email: 'rafael@silvaprado.exemplo.br', nome: 'Rafael Souza' },
  { email: 'marcos@silvaprado.exemplo.br', nome: 'Marcos Lima' }, { email: 'julia@silvaprado.exemplo.br', nome: 'Júlia Reis' },
]
let TAREFAS: Array<Tarefa & { status: string }> | null = null
function tarefasDemo() {
  TAREFAS ??= [
    { id: 't1', titulo: 'Pedir CTPS ao cliente', detalhe: 'Carla Mendes · trabalhista', prazo: dia(-2), fatal: false, responsavel: EQUIPE[2].email, status: 'aberta' },
    { id: 't2', titulo: 'Contestação', detalhe: 'Bruno Teixeira x Metalúrgica Alfa', prazo: dia(-1), fatal: true, responsavel: EQUIPE[1].email, status: 'aberta' },
    { id: 't3', titulo: 'Manifestação sobre o laudo', detalhe: 'José Lima · previdenciário', prazo: dia(0), fatal: true, responsavel: EQUIPE[0].email, status: 'aberta' },
    { id: 't4', titulo: 'Conferir documentos recebidos', detalhe: 'Paula Nunes', prazo: dia(0), fatal: false, responsavel: EQUIPE[3].email, status: 'aberta' },
    { id: 't5', titulo: 'Recurso ordinário', detalhe: 'Diego Alves x Comércio Beta', prazo: dia(4), fatal: true, responsavel: EQUIPE[1].email, status: 'aberta' },
    { id: 't6', titulo: 'Calcular verbas rescisórias', detalhe: 'Lúcia Farias', prazo: dia(12), fatal: false, responsavel: EQUIPE[0].email, status: 'aberta' },
    { id: 't7', titulo: 'Organizar pasta do cliente', detalhe: 'Marcos Dias', prazo: null, fatal: false, responsavel: null, status: 'aberta' },
  ]
  return TAREFAS
}

function dia(n: number): string {
  return diaSP(new Date(Date.now() + n * 86400000))
}

function ler(): boolean { try { return sessionStorage.getItem('hiadv-demo') === '1' } catch { return false } }
function gravar(v: boolean) { try { if (v) sessionStorage.setItem('hiadv-demo', '1'); else sessionStorage.removeItem('hiadv-demo') } catch { /* sem armazenamento */ } }

export function criarApiDemo(): Api {
  let logado = ler()
  let atual = 'demo-sp'
  const ouvintes = new Set<(v: boolean) => void>()
  const avisar = () => ouvintes.forEach((f) => f(logado))

  return {
    async temSessao() { return logado },
    async entrar(_email, senha) {
      if (senha !== 'demo') throw new CredencialInvalida()
      logado = true; gravar(true); avisar()
    },
    async sair() { logado = false; gravar(false); avisar() },
    aoMudarSessao(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn) },
    async perfil(): Promise<Perfil> {
      return { email: 'ana@silvaprado.exemplo.br', nome: 'Ana Prado', papel: 'code', escritorioId: atual, escritorioNome: ESCRITORIOS.find((e) => e.id === atual)!.nome }
    },
    async escritorios() { return ESCRITORIOS.map((e) => ({ ...e, atual: e.id === atual })) },
    async trocarEscritorio(id) { atual = id },
    async areas() { return AREAS[atual] ?? [] },
    async busca(q) {
      const base = [
        { tipo: 'cliente', titulo: 'Rita Moura', trecho: 'Previdenciário · auxílio-acidente', clienteId: 'c1', processoId: null },
        { tipo: 'processo', titulo: 'Bruno Teixeira x Metalúrgica Alfa', trecho: 'Trabalhista · TRT da 12ª Região', clienteId: 'c2', processoId: 'p2' },
        { tipo: 'cliente', titulo: 'José Lima', trecho: 'Previdenciário judicial', clienteId: 'c3', processoId: null },
      ]
      const t = q.toLowerCase()
      return base.filter((b) => (b.titulo + ' ' + b.trecho).toLowerCase().includes(t))
    },
    async itensDoDia(): Promise<ItemDia[]> {
      if (atual === 'demo-tb') {
        return [
          { id: 'x1', tipo: 'audiencia', titulo: 'Audiência inicial', sub: 'Trabalhista · Ana Ribeiro x Transportes Sul', dia: dia(0), hora: '14:00', quem: 'Tamara' },
          { id: 'x2', tipo: 'prazo', titulo: 'Réplica', sub: 'Trabalhista · Diego Alves x Comércio Beta', dia: dia(2), hora: null, quem: 'Tamara' },
        ]
      }
      return [
        { id: 'd1', tipo: 'prazo', titulo: 'Contestação', sub: 'Trabalhista · Bruno Teixeira x Metalúrgica Alfa', dia: dia(-1), hora: null, quem: 'Rafael' },
        { id: 'd2', tipo: 'tarefa', titulo: 'Pedir CTPS ao cliente', sub: 'Trabalhista · Carla Mendes', dia: dia(-2), hora: null, quem: 'Marcos' },
        { id: 'd3', tipo: 'pericia', titulo: 'Perícia médica', sub: 'Previdenciário · Rita Moura · auxílio-acidente', dia: dia(0), hora: '09:30', quem: 'Ana' },
        { id: 'd4', tipo: 'audiencia', titulo: 'Audiência inicial', sub: 'Trabalhista · Ana Ribeiro x Transportes Sul', dia: dia(0), hora: '14:00', quem: 'Rafael' },
        { id: 'd5', tipo: 'prazo', titulo: 'Manifestação sobre o laudo', sub: 'Previdenciário · José Lima', dia: dia(0), hora: null, quem: 'Ana' },
        { id: 'd6', tipo: 'tarefa', titulo: 'Conferir documentos recebidos', sub: 'Previdenciário · Paula Nunes', dia: dia(0), hora: null, quem: 'Júlia' },
        { id: 'd7', tipo: 'prazo', titulo: 'Recurso ordinário', sub: 'Trabalhista · Diego Alves x Comércio Beta', dia: dia(4), hora: null, quem: 'Rafael' },
        { id: 'd8', tipo: 'audiencia', titulo: 'Audiência de instrução', sub: 'Trabalhista · Lúcia Farias x Hospital Gama', dia: dia(6), hora: '10:00', quem: 'Ana' },
        { id: 'd9', tipo: 'tarefa', titulo: 'Organizar pasta do cliente', sub: 'Previdenciário · Marcos Dias', dia: null, hora: null, quem: 'Júlia' },
      ]
    },
    async quadro(area) {
      return { etapas: ETAPAS[area] ?? [], casos: CASOS.filter((c) => AREA_DO_CASO[c.id] === area).map((c) => ({ ...c, destaques: destaquesDoCartao(DEFS[area] ?? [], CAMPOS[c.id]) })) }
    },
    async moverCaso(id, status) {
      const c = CASOS.find((x) => x.id === id)
      if (c) { c.status = status; c.dias = 0 }
    },
    async ficha(id): Promise<Ficha> {
      const c = CASOS.find((x) => x.id === id)
      if (!c) throw new Error('Caso não encontrado.')
      const area = AREA_DO_CASO[id]
      const n = c.gateTotal
      return {
        id, area, cliente: c.cliente, status: c.status, produto: c.produto, numeroCnj: c.numeroCnj,
        campos: { ...(CAMPOS[id] ?? {}) }, defs: DEFS[area] ?? [],
        checklist: CHECK.slice(0, n).map((r, i) => ({ item: `i${i}`, rotulo: r, feito: i < c.gateOk })),
        historico: [...(HIST[id] ?? []), { evento: 'status', de: null, para: c.status, detalhe: null, quem: 'Ana Prado', em: new Date(Date.now() - c.dias * 86400000).toISOString() }],
        etapas: ETAPAS[area] ?? [],
      }
    },
    async salvarCampos(id, campos) {
      const defs = DEFS[AREA_DO_CASO[id]] ?? []
      const atual = (CAMPOS[id] ??= {})
      const mudou: string[] = []
      for (const [k, v] of Object.entries(campos)) {
        const d = defs.find((x) => x.chave === k)
        if (!d) throw new Error(`Campo "${k}" não existe nesta área.`)
        const erro = validarCampo(d, v)
        if (erro) throw new Error(erro)
        const val = v.trim() === '' ? undefined : (d.tipo === 'moeda' || d.tipo === 'numero' ? Number(telaParaValor(d, v)) : v.trim())
        if (val === undefined) delete atual[k]; else atual[k] = val
        mudou.push(d.rotulo)
      }
      if (mudou.length) (HIST[id] ??= []).unshift({ evento: 'campos', de: null, para: null, detalhe: `Atualizou: ${mudou.join(', ')}`, quem: 'Ana Prado', em: new Date().toISOString() })
      return mudou.length
    },
    async equipe() { return EQUIPE.map((p) => ({ ...p })) },
    async tarefas(pessoa) {
      return tarefasDemo().filter((t) => t.status === 'aberta' && (!pessoa || t.responsavel === pessoa)).map(({ status: _s, ...t }) => ({ ...t }))
    },
    async criarTarefa(n) {
      if (n.titulo.trim().length < 2) throw new Error('Escreva o que precisa ser feito.')
      tarefasDemo().push({ id: `t${Date.now()}`, titulo: n.titulo.trim(), detalhe: n.detalhe.trim() || null, prazo: n.prazo || null, fatal: false, responsavel: n.responsavel || null, status: 'aberta' })
    },
    async mudarTarefa(id, status) {
      const t = tarefasDemo().find((x) => x.id === id)
      if (!t) throw new Error('Tarefa não encontrada.')
      t.status = status
    },
  }
}
