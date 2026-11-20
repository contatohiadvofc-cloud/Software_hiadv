import type { Api, Area, Escritorio, Perfil } from './api'
import { CredencialInvalida } from './api'
import { diaSP, type ItemDia } from './seuDia'
import type { CasoCard, Etapa } from './quadro'

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
      return { etapas: ETAPAS[area] ?? [], casos: CASOS.filter((c) => AREA_DO_CASO[c.id] === area).map((c) => ({ ...c })) }
    },
    async moverCaso(id, status) {
      const c = CASOS.find((x) => x.id === id)
      if (c) { c.status = status; c.dias = 0 }
    },
  }
}
