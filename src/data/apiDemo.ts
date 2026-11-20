import type { Api, Area, Escritorio, Perfil } from './api'
import { CredencialInvalida } from './api'
import { diaSP, type ItemDia } from './seuDia'

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
  }
}
