/** Pedidos à IA (usados no servidor, na função "ia"). A IA só escreve rascunhos para o advogado revisar. */

export type AcaoIA = 'resumo_intimacao' | 'quesitos' | 'minuta' | 'resumo_documento'
export const ACOES_IA: { id: AcaoIA; nome: string; dica: string }[] = [
  { id: 'quesitos', nome: 'Quesitos para a perícia', dica: 'Use o caso, a profissão na época do fato e os exames que tiver.' },
  { id: 'minuta', nome: 'Minuta de petição', dica: 'Diga qual peça e o que precisa conter. Sai como rascunho para revisar.' },
  { id: 'resumo_documento', nome: 'Resumo de documento', dica: 'Cole o texto de um laudo, exame ou decisão.' },
  { id: 'resumo_intimacao', nome: 'Resumo de intimação', dica: 'O que a intimação pede, o prazo e a providência.' },
]

export type PedidoIA = {
  acao: AcaoIA
  /** Texto principal: a intimação, o documento colado ou o que for lido do Drive. */
  texto?: string
  /** O que o advogado quer (peça, foco, observações). */
  instrucao?: string
  /** Dados do caso já conhecidos pelo HiAdv (benefício, área, etapa, nome do cliente). */
  caso?: Record<string, string | null | undefined>
  arquivos?: { nome: string; texto: string }[]
}

export const LIMITE_TEXTO = 60_000

const REGRAS = [
  'Você ajuda um escritório de advocacia brasileiro, principalmente previdenciário. Escreva em português do Brasil, linguagem técnica e clara.',
  'Tudo o que você escreve é um rascunho para o advogado revisar e decidir. Não prometa resultado, não dê parecer definitivo e não oriente o cliente diretamente.',
  'Use somente os fatos fornecidos. Nunca invente datas, números de processo, CIDs, exames, nomes ou jurisprudência. Onde faltar informação, escreva [completar: o que falta].',
  'Não escreva código de programação, comandos ou instruções para sistemas. Responda apenas com o texto pedido.',
  'Não repita dados pessoais desnecessários (CPF, endereço) além do que o texto exigir.',
].join('\n')

const TAREFA: Record<AcaoIA, string> = {
  resumo_intimacao: 'Resuma a intimação ou publicação abaixo em texto corrido: o que foi decidido ou pedido, quem precisa agir, o prazo indicado no texto (se houver) e a providência sugerida para o advogado conferir.',
  quesitos: 'Elabore quesitos para a perícia médica judicial do caso. Antes dos quesitos, faça uma síntese dos fatos em um único parágrafo e uma advertência ao perito para responder conforme a lei e justificar cada resposta. Cite a profissão exercida na época do fato, não a atual. Em ao menos um quesito, cite a documentação médica fornecida (exames, atestados, laudos, com datas) quando houver.',
  minuta: 'Redija a minuta da peça pedida na instrução, com endereçamento no formato "MERITÍSSIMO JUÍZO DO(A) ..." e títulos de seção. Use apenas os fatos fornecidos e marque [completar] onde faltar.',
  resumo_documento: 'Resuma o documento abaixo em texto corrido, destacando datas, diagnósticos, limitações funcionais e conclusões, sem interpretar além do que está escrito.',
}

function cortar(t: string, max: number) {
  return t.length > max ? t.slice(0, max) + '\n[texto cortado por tamanho]' : t
}

/** Monta o pedido (sistema + mensagem). Lança erro com mensagem pronta para a tela quando falta o essencial. */
export function montarPedidoIA(p: PedidoIA): { sistema: string; mensagem: string } {
  if (!p || !Object.prototype.hasOwnProperty.call(TAREFA, p.acao)) throw new Error('Ação desconhecida.')
  const texto = (p.texto ?? '').trim()
  const instrucao = (p.instrucao ?? '').trim()
  const arquivos = (p.arquivos ?? []).filter((a) => a.texto?.trim())
  if ((p.acao === 'resumo_intimacao' || p.acao === 'resumo_documento') && !texto && !arquivos.length) throw new Error('Cole o texto ou escolha um arquivo para resumir.')
  if (p.acao === 'minuta' && !instrucao) throw new Error('Diga qual peça você quer e o que ela precisa conter.')
  const partes: string[] = [`TAREFA: ${TAREFA[p.acao]}`]
  const caso = Object.entries(p.caso ?? {}).filter(([, v]) => v && String(v).trim())
  if (caso.length) partes.push('DADOS DO CASO NO HIADV:\n' + caso.map(([k, v]) => `- ${k}: ${String(v).trim()}`).join('\n'))
  if (instrucao) partes.push('INSTRUÇÃO DO ADVOGADO:\n' + cortar(instrucao, 4000))
  let resta = LIMITE_TEXTO
  if (texto) { const t = cortar(texto, resta); resta -= t.length; partes.push('TEXTO:\n' + t) }
  for (const a of arquivos) {
    if (resta <= 500) { partes.push('[outros arquivos não couberam no pedido]'); break }
    const t = cortar(a.texto.trim(), resta); resta -= t.length
    partes.push(`ARQUIVO "${a.nome.slice(0, 120)}":\n${t}`)
  }
  return { sistema: REGRAS, mensagem: partes.join('\n\n') }
}

/** Remove blocos de código da resposta (a IA do HiAdv não entrega código). */
export function limparResposta(t: string): string {
  return t.replace(/```[\s\S]*?```/g, '[trecho removido]').trim()
}
