/** Exportação completa dos dados do escritório: um CSV por tabela, num ZIP, para abrir no Excel ou levar a outro sistema. */
export const TABELAS_EXPORTACAO: { id: string; nome: string }[] = [
  { id: 'clientes', nome: 'clientes' }, { id: 'casos', nome: 'casos' }, { id: 'casos_historico', nome: 'historico-dos-casos' },
  { id: 'processos', nome: 'processos' }, { id: 'movimentacoes', nome: 'andamentos-dos-processos' }, { id: 'tarefas', nome: 'tarefas-e-prazos' },
  { id: 'pericias', nome: 'pericias' }, { id: 'audiencias', nome: 'audiencias' }, { id: 'pendencias', nome: 'documentos-pedidos' },
  { id: 'documentos', nome: 'documentos' }, { id: 'honorarios', nome: 'honorarios' }, { id: 'fin_lancamentos', nome: 'financeiro' },
  { id: 'horas', nome: 'horas-trabalhadas' }, { id: 'leads', nome: 'atendimentos' }, { id: 'contatos', nome: 'contatos' },
  { id: 'notas', nome: 'anotacoes' }, { id: 'registros', nome: 'registros' }, { id: 'cliente_atualizacoes', nome: 'atualizacoes-meu-processo' },
  { id: 'indicacoes', nome: 'indicacoes' }, { id: 'compras', nome: 'compras' }, { id: 'reunioes', nome: 'reunioes' },
  { id: 'biblioteca', nome: 'modelos-da-biblioteca' }, { id: 'auditoria', nome: 'historico-de-auditoria' },
]

function celula(v: unknown): string {
  if (v === null || v === undefined) return ''
  let t = typeof v === 'object' ? JSON.stringify(v) : String(v)
  // planilha não pode executar fórmula vinda de dado (=, +, -, @)
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/** CSV com ponto e vírgula e marca UTF-8, como o Excel em português espera. */
export function paraCsv(linhas: Record<string, unknown>[]): string {
  const colunas: string[] = []
  for (const l of linhas) for (const k of Object.keys(l)) if (!colunas.includes(k)) colunas.push(k)
  if (!colunas.length) return '﻿'
  return '﻿' + [colunas.map(celula).join(';'), ...linhas.map((l) => colunas.map((c) => celula(l[c])).join(';'))].join('\r\n') + '\r\n'
}

export function leiaMe(escritorio: string, contagem: Record<string, number>, quando = new Date()): string {
  const data = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return [`Exportação dos dados do escritório ${escritorio}`, `Gerada em ${data} pelo HiAdv.`, '',
    'Cada arquivo .csv é uma tabela e abre no Excel, no Google Planilhas ou no LibreOffice (separador: ponto e vírgula).',
    'Senhas, códigos de acesso e chaves de integração não são exportados, por segurança.',
    'Os arquivos guardados (PDFs, fotos) continuam no sistema; a lista deles está em documentos.csv.', '', 'Linhas por tabela:',
    ...TABELAS_EXPORTACAO.map((t) => `- ${t.nome}.csv: ${contagem[t.id] ?? 0}`), ''].join('\r\n')
}

export const nomeZip = (escritorio: string, quando = new Date()) =>
  `${quando.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).replace(/-/g, '_')}-hiadv-${escritorio.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escritorio'}.zip`
