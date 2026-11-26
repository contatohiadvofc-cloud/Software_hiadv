import { useSyncExternalStore } from 'react'

/** A chamada em andamento fica fora das telas: dá para navegar pelo HiAdv sem cair da chamada. */
export type ChamadaAtiva = { id: string; video: boolean; titulo: string; conversa: string; eu: { email: string; nome: string } }

let atual: ChamadaAtiva | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())

export function abrirChamada(c: ChamadaAtiva) { if (atual?.id === c.id) return; atual = c; avisar() }
export function fecharChamada() { atual = null; avisar() }
export function chamadaAtual() { return atual }
export function useChamadaAtiva(): ChamadaAtiva | null {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }, () => atual, () => null)
}
