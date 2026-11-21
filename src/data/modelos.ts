import { PRODUTOS_PREV } from './cadastro'
import { nomeDaArea } from './areas'
import { cnjTela } from './publicacoes'

export type DadosCliente = {
  nome: string; cpf?: string | null; telefone?: string | null; email?: string | null
  nacionalidade?: string; estado_civil?: string; profissao?: string; rg?: string; nascimento?: string
  endereco?: string; bairro?: string; cidade?: string; uf?: string; cep?: string
}
export type DadosDocumento = {
  cliente: DadosCliente
  caso: { area: string; produto: string | null; nb: string | null; dib: string | null; dcb: string | null; data_acidente: string | null; causa_acidente: string | null; sequela: string | null; profissao_epoca: string | null; uf: string | null; relato: string | null; processo: string | null } | null
  escritorio: { nome: string; cidade: string | null; oabs: string[] | null }
  advogado: { nome: string | null; oab: string | null }
}
export const CAMPOS_QUALIFICACAO: { chave: keyof DadosCliente; rotulo: string; dica?: string }[] = [
  { chave: 'nacionalidade', rotulo: 'Nacionalidade', dica: 'brasileiro(a)' }, { chave: 'estado_civil', rotulo: 'Estado civil' },
  { chave: 'profissao', rotulo: 'Profissão' }, { chave: 'rg', rotulo: 'RG' }, { chave: 'nascimento', rotulo: 'Nascimento' },
  { chave: 'endereco', rotulo: 'Endereço (rua e número)' }, { chave: 'bairro', rotulo: 'Bairro' }, { chave: 'cidade', rotulo: 'Cidade' },
  { chave: 'uf', rotulo: 'UF' }, { chave: 'cep', rotulo: 'CEP' },
]

/** Variáveis que os modelos podem usar, escritas assim: {{cliente.nome}}. */
export const VARIAVEIS: { chave: string; rotulo: string }[] = [
  { chave: 'cliente.nome', rotulo: 'Nome do cliente' }, { chave: 'cliente.cpf', rotulo: 'CPF' }, { chave: 'cliente.rg', rotulo: 'RG' },
  { chave: 'cliente.nacionalidade', rotulo: 'Nacionalidade' }, { chave: 'cliente.estado_civil', rotulo: 'Estado civil' }, { chave: 'cliente.profissao', rotulo: 'Profissão' },
  { chave: 'cliente.nascimento', rotulo: 'Data de nascimento' }, { chave: 'cliente.endereco_completo', rotulo: 'Endereço completo' },
  { chave: 'cliente.cidade', rotulo: 'Cidade do cliente' }, { chave: 'cliente.uf', rotulo: 'UF do cliente' }, { chave: 'cliente.telefone', rotulo: 'Telefone' },
  { chave: 'cliente.email', rotulo: 'E-mail' }, { chave: 'cliente.qualificacao', rotulo: 'Qualificação completa' },
  { chave: 'caso.area', rotulo: 'Área do caso' }, { chave: 'caso.beneficio', rotulo: 'Benefício' }, { chave: 'caso.nb', rotulo: 'Número do benefício (NB)' },
  { chave: 'caso.dib', rotulo: 'DIB' }, { chave: 'caso.dcb', rotulo: 'DCB' }, { chave: 'caso.data_acidente', rotulo: 'Data do acidente' },
  { chave: 'caso.causa_acidente', rotulo: 'Causa do acidente' }, { chave: 'caso.sequela', rotulo: 'Sequela' }, { chave: 'caso.profissao_epoca', rotulo: 'Profissão na época' },
  { chave: 'caso.processo', rotulo: 'Número do processo' }, { chave: 'caso.relato', rotulo: 'Relato do cliente' },
  { chave: 'escritorio.nome', rotulo: 'Nome do escritório' }, { chave: 'escritorio.cidade', rotulo: 'Cidade do escritório' },
  { chave: 'advogado.nome', rotulo: 'Advogado(a) que gera' }, { chave: 'advogado.oab', rotulo: 'OAB do advogado(a)' },
  { chave: 'data.hoje', rotulo: 'Data de hoje por extenso' }, { chave: 'data.local_e_data', rotulo: 'Cidade e data' },
]

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const dataExtenso = (iso: string) => `${Number(iso.slice(8, 10))} de ${MESES[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}`
const dataCurta = (iso: string | null | undefined) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
export const cpfTela = (c: string | null | undefined) => { const d = (c ?? '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (c ?? '') }
const cepTela = (c: string | undefined) => { const d = (c ?? '').replace(/\D/g, ''); return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : (c ?? '') }

export function enderecoCompleto(c: DadosCliente): string {
  const cidade = [c.cidade, c.uf].filter(Boolean).join('/')
  return [c.endereco, c.bairro, cidade, c.cep ? `CEP ${cepTela(c.cep)}` : ''].filter(Boolean).join(', ')
}

/** "Fulano de Tal, brasileiro, casado, pedreiro, portador do RG nº …, inscrito no CPF sob o nº …, residente em …" sem as partes que faltam. */
export function qualificacao(c: DadosCliente): string {
  const partes = [c.nome, c.nacionalidade, c.estado_civil, c.profissao,
    c.rg ? `portador(a) do RG nº ${c.rg}` : '', c.cpf ? `inscrito(a) no CPF sob o nº ${cpfTela(c.cpf)}` : '',
    enderecoCompleto(c) ? `residente e domiciliado(a) em ${enderecoCompleto(c)}` : '']
  return partes.filter((x) => x && x.trim()).join(', ')
}

/** Valores de todas as variáveis ('' = não informado). */
export function mapaDeValores(d: DadosDocumento, hoje: string): Record<string, string> {
  const c = d.cliente, k = d.caso
  const beneficio = k ? (PRODUTOS_PREV.find((p) => p.valor === k.produto)?.nome ?? (k.produto && k.produto !== k.area ? k.produto : '')) : ''
  const cidadeEsc = d.escritorio.cidade ?? ''
  return {
    'cliente.nome': c.nome, 'cliente.cpf': cpfTela(c.cpf), 'cliente.rg': c.rg ?? '', 'cliente.nacionalidade': c.nacionalidade ?? '',
    'cliente.estado_civil': c.estado_civil ?? '', 'cliente.profissao': c.profissao ?? '', 'cliente.nascimento': dataCurta(c.nascimento),
    'cliente.endereco_completo': enderecoCompleto(c), 'cliente.cidade': c.cidade ?? '', 'cliente.uf': c.uf ?? '',
    'cliente.telefone': c.telefone ?? '', 'cliente.email': c.email ?? '', 'cliente.qualificacao': qualificacao(c),
    'caso.area': k ? nomeDaArea(k.area) : '', 'caso.beneficio': beneficio, 'caso.nb': k?.nb ?? '', 'caso.dib': dataCurta(k?.dib), 'caso.dcb': dataCurta(k?.dcb),
    'caso.data_acidente': dataCurta(k?.data_acidente), 'caso.causa_acidente': k?.causa_acidente ?? '', 'caso.sequela': k?.sequela ?? '',
    'caso.profissao_epoca': k?.profissao_epoca ?? '', 'caso.processo': k?.processo ? cnjTela(k.processo) : '', 'caso.relato': k?.relato ?? '',
    'escritorio.nome': d.escritorio.nome, 'escritorio.cidade': cidadeEsc, 'advogado.nome': d.advogado.nome ?? '', 'advogado.oab': d.advogado.oab ?? '',
    'data.hoje': dataExtenso(hoje), 'data.local_e_data': `${cidadeEsc ? `${cidadeEsc}, ` : ''}${dataExtenso(hoje)}`,
  }
}

export const MARCA_FALTA = (rotulo: string) => `[PREENCHER: ${rotulo}]`
const rotuloDe = (chave: string) => VARIAVEIS.find((v) => v.chave === chave)?.rotulo ?? chave

/** Troca {{variavel}} pelos valores. O que não tiver valor vira [PREENCHER: …] e entra na lista de faltas. */
export function preencher(texto: string, valores: Record<string, string>): { texto: string; faltando: string[]; desconhecidas: string[] } {
  const faltando = new Set<string>(), desconhecidas = new Set<string>()
  const saida = texto.replace(/\{\{\s*([a-z_]+\.[a-z_]+)\s*\}\}/gi, (inteiro, chave: string) => {
    const k = chave.toLowerCase()
    if (!(k in valores)) { desconhecidas.add(chave); return inteiro }
    if (!valores[k]) { faltando.add(rotuloDe(k)); return MARCA_FALTA(rotuloDe(k)) }
    return valores[k]
  })
  return { texto: saida, faltando: [...faltando], desconhecidas: [...desconhecidas] }
}

/** Nome do arquivo no padrão do escritório: AAAA_MM_DD - Título - Cliente.docx */
export function nomeArquivo(titulo: string, cliente: string, hoje: string): string {
  const limpo = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  return `${hoje.replace(/-/g, '_')} - ${limpo(titulo)} - ${limpo(cliente)}.docx`
}
