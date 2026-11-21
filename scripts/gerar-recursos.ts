// Gera docs/RECURSOS.md a partir de src/data/recursos.ts (o mesmo texto que aparece em Configurações).
import { writeFileSync } from 'node:fs'
import { NOMES_GRUPO, RECURSOS, type Grupo } from '../src/data/recursos'

const linhas = ['# Recursos do HiAdv', '', 'O que já vem ligado, o que o escritório ativa (e como) e o que está em preparação. Este arquivo é gerado a partir de `src/data/recursos.ts` (`npm run recursos`); o mesmo conteúdo aparece em Configurações, "Recursos do HiAdv".', '']
for (const g of ['ligado', 'ativar', 'preparo'] as Grupo[]) {
  linhas.push(`## ${NOMES_GRUPO[g]}`, '')
  for (const r of RECURSOS.filter((x) => x.grupo === g)) {
    linhas.push(`### ${r.nome}${r.soGestor ? ' (Gestor Master)' : ''}`, '', r.resumo, '')
    if (r.onde) linhas.push(`Onde fica: ${r.onde.rotulo}.`, '')
    if (r.passos) { r.passos.forEach((p, i) => linhas.push(g === 'ativar' ? `${i + 1}. ${p}` : `- ${p}`)); linhas.push('') }
    if (r.custo) linhas.push(`Custo: ${r.custo}`, '')
  }
}
writeFileSync('docs/RECURSOS.md', linhas.join('\n'))
console.log('docs/RECURSOS.md atualizado')
