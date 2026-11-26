import { problemaOrientacao, MAX_ORIENTACOES, type AprendizadoIA } from './iaAprendizado'
const demoIA: AprendizadoIA & { seq: number } = {
  seq: 10,
  pendentes: [{ id: 2, quem: 'ana@demo.hiadv', acao: 'quesitos', pedido: 'Quesitos para perícia de joelho (LCA)', comoQueria: 'Queria os quesitos numerados no formato 1 -, 2 -, 3 - e no máximo 15.', em: '2026-11-25T14:00:00Z' }],
  orientacoes: [{ id: 1, acao: 'minuta', texto: 'Nos pedidos, coloque cada pedido em parágrafo próprio, identificado por a), b), c).', ativo: true, usos: 12, criadoPor: 'gestor@demo.hiadv', em: '2026-11-20T12:00:00Z' }],
  resumo: { uteis: 18, naoUteis: 3 },
}
import { conversasDemo } from './conversasDemo'
import { suporteDemo } from './suporteDemo'
import { RECURSOS_POR_PLANO } from './planos'
import type { Api, Area, Escritorio, Perfil } from './api'
import { lerValor, previaParcelas, validarHonorario, validarLancamento, type Honorario, type Lancamento } from './financeiro'
import { oabTela, validarPrazo, type Publicacao } from './publicacoes'
import { nomeDaArea } from './areas'
import { PRODUTOS_PREV, areaPrevidenciaria, soDigitos, validarCliente } from './cadastro'
import { CredencialInvalida } from './api'
import { diaSP, type ItemDia } from './seuDia'
import { destaquesDoCartao, type CasoCard, type Etapa } from './quadro'
import { ordenarAtencao, REGRAS_PADRAO, validarRegras, type Falha, type ItemAtencao, type ParDuplicado, type RegrasAtencao } from './atencao'
import { AREAS_PREVIDENCIARIAS, BENEFICIO_DEFS, etapaDeExigencia, prazoInterno, validarExigencia, validarProtocolo, type EventoHistorico, type Ficha } from './ficha'
import { telaParaValor, validarCampo, type CampoDef } from './campos'
import type { Pessoa, Tarefa } from './tarefas'
import type { ClienteResumo } from './clientes'
import type { Compromisso } from './agenda'
import type { Agente, Integracao, ItemBiblioteca } from './escritorio'
import { validarLead, type Lead } from './atendimentos'
import type { RegistroHoras } from './horas'
import { validarAdesao, type Adesao } from './adesao'
import { validarCandidatura, validarEntrevista, validarProposta, validarVaga, type Candidatura, type Vaga } from './recrutamento'
import { montarPedidoIA } from './iaPrompts'
import { validarNovo, type DetalheCentral, type EscritorioCentral } from './central'

const hojeDemo = () => new Date().toISOString().slice(0, 10)
const LEADS: Lead[] = [
  { id: 'ld1', nome: 'Marcos Antunes', telefone: '49999220001', origem: 'Instagram', area: 'administrativo', assunto: 'Fraturou o punho no trabalho em 2023, voltou a trabalhar com dor.', etapa: 'novo', motivoPerda: null, responsavel: 'ana@silvaprado.exemplo.br', proximoContato: hojeDemo(), clienteId: null, criadoEm: new Date().toISOString() },
  { id: 'ld2', nome: 'Paula Rech', telefone: '49999220002', origem: 'Indicação', area: 'trabalhista', assunto: 'Horas extras sem pagamento.', etapa: 'conversa', motivoPerda: null, responsavel: 'ana@silvaprado.exemplo.br', proximoContato: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10), clienteId: null, criadoEm: new Date(Date.now() - 5 * 864e5).toISOString() },
  { id: 'ld3', nome: 'Sérgio Batista', telefone: null, origem: 'Site', area: 'judicial', assunto: 'Auxílio-doença negado.', etapa: 'proposta', motivoPerda: null, responsavel: null, proximoContato: null, clienteId: null, criadoEm: new Date(Date.now() - 9 * 864e5).toISOString() },
]
const HORAS: (RegistroHoras & { cliente: string })[] = [
  { id: 'hr1', email: 'ana@silvaprado.exemplo.br', nome: 'Ana Prado', descricao: 'Reunião inicial e análise do CNIS', dia: hojeDemo(), minutos: 75, minha: true, cliente: 'c1' },
]
const PORTAIS = new Map<string, { cliente: string; expira: string; acessos: number }>()
let contatoDemo = { cidade: 'Capinzal' as string | null, whatsapp: '49999990000' as string | null }
let agendaDemo = false
const ADESOES: Adesao[] = []
const VAGAS: Vaga[] = [{ id: 'vg1', slug: 'assistente-de-triagem-documental', escritorioSlug: 'silva-prado-advocacia', status: 'aberta', total: 3, novos: 1, criadoEm: '2026-11-20T10:00:00Z',
  funcao: 'triagem', titulo: 'Assistente de triagem documental', regime: 'CLT', modalidade: 'Remoto', jornada: 'Seg. a sex., 8h às 17h', cidade: '', salario: 2300, salarioObs: '+ bonificação por meta',
  mostrarSalario: true, beneficios: ['Vale-alimentação R$ 450', 'Auxílio internet R$ 100', 'Notebook fornecido'], atividades: ['Conferir laudos e exames', 'Analisar o CNIS e organizar a pasta'],
  requisitos: ['Ensino médio completo', 'Atenção a detalhe'], diferenciais: ['Experiência com documentos médicos'], perguntas: ['Como você organiza uma tarefa com muitos documentos?'], quantidade: 1, inscricoesAte: null }]
const CANDIDATOS: (Candidatura & { vaga: string })[] = [
  { id: 'cd1', vaga: 'vg1', nome: 'Ana Ferreira', email: 'ana@exemplo.com', whatsapp: '49988887777', cidade: 'Joaçaba', uf: 'SC', linkedin: null, curriculoPath: null, respostas: { 0: 'Separo por tipo e confiro uma lista.' }, bancoTalentos: true, etapa: 'recebido', nota: null, obs: null, criadoEm: '2026-11-25T12:00:00Z' },
  { id: 'cd2', vaga: 'vg1', nome: 'Bruno Lima', email: 'bruno@exemplo.com', whatsapp: '49977776666', cidade: 'Capinzal', uf: 'SC', linkedin: null, curriculoPath: null, respostas: { 0: 'Faço uma planilha.' }, bancoTalentos: false, etapa: 'triagem', nota: 4, obs: null, criadoEm: '2026-11-24T12:00:00Z' },
  { id: 'cd3', vaga: 'vg1', nome: 'Carla Souza', email: 'carla@exemplo.com', whatsapp: '49966665555', cidade: 'Herval d\'Oeste', uf: 'SC', linkedin: null, curriculoPath: null, respostas: { 0: 'Por prazo.' }, bancoTalentos: false, etapa: 'entrevista', nota: 5, obs: 'Boa comunicação.', criadoEm: '2026-11-23T12:00:00Z' },
]
function contarVaga(id: string) { const v = VAGAS.find((x) => x.id === id); if (v) { const l = CANDIDATOS.filter((c) => c.vaga === id); v.total = l.length; v.novos = l.filter((c) => c.etapa === 'recebido').length } }
const CENTRAL: (EscritorioCentral & { detalhe: DetalheCentral })[] = [
  { id: 'demo', nome: 'Silva & Prado Advocacia (demonstração)', cidade: 'Joinville/SC', ativo: true, oabsMaster: ['OAB/SC 00.101'], plano: 'premium', situacao: 'ativo', fundador: true, testeAte: null, pagoAte: null, obs: null,
    limites: { masters: 3, colaboradores: 8, oabs: 3, iaMensal: 0 }, uso: { masters: 2, colaboradores: 2, oabs: 1, iaMes: 0 }, ajustes: 0, preco: 397.5, saude: 82, ultimoAcesso: new Date().toISOString(), masterNome: 'Ana Prado', casos: 48,
    detalhe: { ajustes: [], recursos: [], pessoas: [{ email: 'ana@silvaprado.exemplo.br', nome: 'Ana Prado', papel: 'master', bloqueios: [] }, { email: 'marcos@silvaprado.exemplo.br', nome: 'Marcos Lima', papel: 'colaborador', bloqueios: [] }], historico: [] } },
]
const RECURSOS_PLANO: Record<string, string[]> = RECURSOS_POR_PLANO
function recalcular(e: (typeof CENTRAL)[number]) {
  e.detalhe.recursos = RECURSOS_PLANO.supremo.map((r) => {
    const aj = e.detalhe.ajustes.find((a) => a.recurso === r)
    const noPlano = RECURSOS_PLANO[e.plano ?? 'supremo'].includes(r)
    return { recurso: r, noPlano, liberado: aj ? aj.valor === 'liberado' : noPlano }
  })
  e.ajustes = e.detalhe.ajustes.length
}
CENTRAL.forEach(recalcular)
const CODIGO_DEMO = 'ANA7K2Q'
const PAGAMENTOS_DEMO: { competencia: string; valor: number; pagoEm: string; forma: string }[] = []

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
const BENEF: Record<string, Record<string, unknown>> = {
  k6: { nb: '712.345.678-9', dib: '2025-02-10', data_acidente: '2024-11-03', uf: 'SC', profissao_epoca: 'Auxiliar de produção', causa_acidente: 'Queda de escada no trabalho', sequela: 'Limitação de flexão do punho direito' },
  k8: { nb: '698.112.334-0', uf: 'SC', profissao_epoca: 'Pedreiro' },
}
const MARCADOS: Record<string, Record<string, string>> = {}
const CHECK = ['Procuração assinada', 'Documento com foto', 'CTPS digital', 'Holerites', 'Termo de rescisão', 'Laudos e exames', 'CNIS']

const CLIENTE_DO_CASO: Record<string, string> = { k1: 'c2', k2: 'c4', k3: 'c5', k4: 'c6', k5: 'c7', k6: 'c1', k7: 'c8', k8: 'c3' }
const CPFS: Record<string, string> = { c1: '52998224725' }
const OABS_DEMO: string[] = ['OAB/SP 123.456']
const DADOS_CLIENTE: Record<string, Record<string, string>> = { c1: { nacionalidade: 'brasileira', estado_civil: 'casada', profissao: 'costureira', cidade: 'São Paulo', uf: 'SP' } }
const mesAtual = () => new Date().toISOString().slice(0, 7)
const LANCAMENTOS: Lancamento[] = [
  { id: 'l1', sentido: 'entrada', etiqueta: 'Honorários', titulo: 'Parcela 2/6 · Rita Moura', descricao: null, valor: 500, vencimento: `${mesAtual()}-05`, pagoEm: `${mesAtual()}-05`, clienteId: 'c1', cliente: 'Rita Moura', telefone: '49999110001', honorarioId: 'h1' },
  { id: 'l2', sentido: 'entrada', etiqueta: 'Honorários', titulo: 'Parcela 1/3 · Bruno Teixeira', descricao: null, valor: 800, vencimento: new Date(Date.now() - 20 * 864e5).toISOString().slice(0, 10), pagoEm: null, clienteId: 'c2', cliente: 'Bruno Teixeira', telefone: '49999110002', honorarioId: null },
  { id: 'l3', sentido: 'entrada', etiqueta: 'Honorários', titulo: 'Parcela 3/6 · Rita Moura', descricao: null, valor: 500, vencimento: `${mesAtual()}-28`, pagoEm: null, clienteId: 'c1', cliente: 'Rita Moura', telefone: '49999110001', honorarioId: 'h1' },
  { id: 'l4', sentido: 'saida', etiqueta: 'Despesas', titulo: 'Internet do escritório', descricao: null, valor: 120, vencimento: `${mesAtual()}-10`, pagoEm: `${mesAtual()}-10`, clienteId: null, cliente: null, telefone: null, honorarioId: null },
]
const HONORARIOS: (Omit<Honorario, 'recebido' | 'aReceber' | 'atrasado'> & { clienteId: string })[] = [
  { id: 'h1', clienteId: 'c1', tipo: 'misto', descricao: 'Auxílio-acidente: entrada + êxito', valorFixo: 3000, parcelas: 6, percentualExito: 30, status: 'ativo', criadoEm: '2026-09-01T12:00:00Z' },
]
const haDias = (n: number, h = 13) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10) + `T${String(h).padStart(2, '0')}:00:00Z`
const PUBLICACOES: Publicacao[] = [
  { id: 1, quando: haDias(0), publicacao: true, titulo: 'Intimação', texto: 'Fica a parte autora intimada para, no prazo de 15 (quinze) dias, manifestar-se sobre o laudo pericial juntado no evento 32.', processoId: 'p1', numeroCnj: '50012345620264047212', clienteId: 'c1', cliente: 'Rita Moura', tarefa: { id: 'tp1', prazo: null, feita: false } },
  { id: 2, quando: haDias(1), publicacao: false, titulo: 'Juntada de laudo pericial', texto: null, processoId: 'p1', numeroCnj: '50012345620264047212', clienteId: 'c1', cliente: 'Rita Moura', tarefa: null },
  { id: 3, quando: haDias(2, 15), publicacao: true, titulo: 'Despacho', texto: 'Designo audiência de conciliação para 10/12, às 14h, por videoconferência. Intimem-se.', processoId: 'p2', numeroCnj: '00004567820265120001', clienteId: 'c2', cliente: 'Bruno Teixeira', tarefa: null },
  { id: 4, quando: haDias(6), publicacao: true, titulo: 'Sentença', texto: 'Julgo procedente o pedido para condenar o INSS a conceder o auxílio-acidente desde a cessação do auxílio-doença.', processoId: 'p3', numeroCnj: '50098765420254047212', clienteId: 'c3', cliente: 'José Lima', tarefa: { id: 'tp2', prazo: null, feita: true } },
]
const CLIENTES: ClienteResumo[] = [
  { id: 'c1', nome: 'Rita Moura', telefone: '49999110001', origem: 'site', desde: '2026-08-02T12:00:00Z' },
  { id: 'c2', nome: 'Bruno Teixeira', telefone: '49999110002', origem: 'whatsapp', desde: '2026-09-10T12:00:00Z' },
  { id: 'c3', nome: 'José Lima', telefone: null, origem: 'indicação', desde: '2026-05-21T12:00:00Z' },
  { id: 'c4', nome: 'Carla Mendes', telefone: '49999110004', origem: 'whatsapp', desde: '2026-10-01T12:00:00Z' },
  { id: 'c5', nome: 'Ana Ribeiro', telefone: '49999110005', origem: 'site', desde: '2026-07-15T12:00:00Z' },
  { id: 'c6', nome: 'Diego Alves', telefone: '49999110006', origem: 'whatsapp', desde: '2026-06-30T12:00:00Z' },
  { id: 'c7', nome: 'Lúcia Farias', telefone: '49999110007', origem: 'site', desde: '2026-11-03T12:00:00Z' },
  { id: 'c8', nome: 'Paula Nunes', telefone: '49999110008', origem: 'chatbot', desde: '2026-11-12T12:00:00Z' },
]

const RELATOS: Record<string, string> = {
  k6: 'Trabalhava como auxiliar de produção quando caiu da escada do setor, em 03/11/2024, e fraturou o punho direito. Ficou afastada pelo INSS até fevereiro de 2025. Voltou ao trabalho, mas não consegue mais carregar caixas nem fazer força com a mão direita.',
}
const BIBLIOTECA: ItemBiblioteca[] = [
  { id: 'b1', tipo: 'modelo', titulo: 'Inicial de auxílio-acidente (JEF)', area: 'judicial', peca: 'Petição inicial', conteudo: 'MERITÍSSIMO JUÍZO DA __ VARA FEDERAL DE __\n\n{{cliente.nome}}, {{cliente.qualificacao}}…', link: null, arquivo: null, arquivoNome: 'inicial-auxilio-acidente.docx', tamanho: 48211, criadoPor: 'ana@silvaprado.exemplo.br', criadoEm: '2026-11-10T12:00:00Z' },
  { id: 'b2', tipo: 'modelo', titulo: 'Kit do cliente (contrato, procuração, declaração)', area: null, peca: 'Kit do cliente', conteudo: null, link: null, arquivo: null, arquivoNome: 'kit-cliente.docx', tamanho: 61002, criadoPor: 'ana@silvaprado.exemplo.br', criadoEm: '2026-11-08T12:00:00Z' },
  { id: 'b3', tipo: 'modelo', titulo: 'Reclamação trabalhista: verbas rescisórias', area: 'trabalhista', peca: 'Petição inicial', conteudo: 'Modelo fictício para demonstração.', link: null, arquivo: null, arquivoNome: null, tamanho: null, criadoPor: 'rafael@silvaprado.exemplo.br', criadoEm: '2026-11-12T12:00:00Z' },
  { id: 'b4', tipo: 'jurisprudencia', titulo: 'Tema exemplo: redução da capacidade em grau mínimo', area: 'judicial', peca: null, conteudo: 'Ementa fictícia para demonstração do sistema.', link: 'https://exemplo.br/precedente', arquivo: null, arquivoNome: null, tamanho: null, criadoPor: 'ana@silvaprado.exemplo.br', criadoEm: '2026-11-09T12:00:00Z' },
  { id: 'b5', tipo: 'tese', titulo: 'Sequela que exige maior esforço na mesma função', area: 'judicial', peca: null, conteudo: 'Linha de argumentação fictícia para demonstração.', link: null, arquivo: null, arquivoNome: null, tamanho: null, criadoPor: 'ana@silvaprado.exemplo.br', criadoEm: '2026-11-11T12:00:00Z' },
]
const INTEGRACOES: Integracao[] = [
  { servico: 'claude', ativo: false, modo: null, limiteMensal: null, temChave: false, chaveFinal: null, configuradoEm: null, configuradoPor: null },
  { servico: 'zapsign', ativo: false, modo: 'um_clique', limiteMensal: null, temChave: false, chaveFinal: null, configuradoEm: null, configuradoPor: null },
  { servico: 'google_drive', ativo: false, modo: null, limiteMensal: null, temChave: false, chaveFinal: null, configuradoEm: null, configuradoPor: null },
  ...(['escavador', 'judit', 'clicksign', 'd4sign', 'asaas'] as const).map((servico) => ({ servico, ativo: false, modo: null, limiteMensal: null, temChave: false, chaveFinal: null, configuradoEm: null, configuradoPor: null })),
]
const CATALOGO: Array<Omit<Agente, 'ativo' | 'etapas' | 'modeloId' | 'modeloTitulo' | 'parametros'>> = [
  { agente: 'conferente_dados', nome: 'Conferente de dados', descricao: 'Quando o caso entra na etapa escolhida, confere relato, dados do benefício ou da área e checklist. Se faltar algo, cria uma tarefa dizendo exatamente o quê.', areas: null, precisa: [], usaModelo: false, semCusto: true },
  { agente: 'pedido_documentos', nome: 'Pedido de documentos', descricao: 'Quando o caso entra na etapa escolhida, cria uma tarefa com os documentos que faltam e a mensagem pronta para enviar ao cliente. Nada é enviado sozinho.', areas: null, precisa: [], usaModelo: false, semCusto: true },
  { agente: 'acompanhamento', nome: 'Acompanhamento', descricao: 'Quando o caso entra na etapa escolhida, agenda uma tarefa de retorno em alguns dias úteis, para o caso não ficar parado.', areas: null, precisa: [], usaModelo: false, semCusto: true },
  { agente: 'triagem', nome: 'Triagem', descricao: 'Lê o relato e os documentos do lead e aponta se o caso parece viável e o que falta. A decisão é do advogado.', areas: null, precisa: ['claude', 'relato'], usaModelo: false, semCusto: false },
  { agente: 'leitora', nome: 'Leitora de documentos', descricao: 'Extrai de laudos, exames e atestados as datas, CID, sequela e médico, montando a linha do tempo clínica do caso.', areas: null, precisa: ['claude'], usaModelo: false, semCusto: false },
  { agente: 'cnis', nome: 'Analista de CNIS', descricao: 'Confere qualidade de segurado, carência, vínculo na data do fato e lacunas de contribuição.', areas: ['administrativo', 'judicial'], precisa: ['claude'], usaModelo: false, semCusto: false },
  { agente: 'redatora', nome: 'Redatora', descricao: 'Escreve a minuta da peça a partir do modelo do escritório, do relato e das provas do caso. Entrega para revisão; nunca protocola.', areas: null, precisa: ['claude', 'relato', 'modelo'], usaModelo: true, semCusto: false },
  { agente: 'quesitos', nome: 'Quesitos periciais', descricao: 'Prepara quesitos citando a documentação médica com datas, no padrão do escritório.', areas: ['administrativo', 'judicial', 'trabalhista'], precisa: ['claude', 'modelo'], usaModelo: true, semCusto: false },
  { agente: 'laudo', nome: 'Análise de laudo', descricao: 'Compara o laudo pericial com os documentos do caso e prepara a base da manifestação ou impugnação.', areas: ['judicial', 'trabalhista'], precisa: ['claude'], usaModelo: false, semCusto: false },
  { agente: 'conferente', nome: 'Conferente', descricao: 'Revisa toda minuta: destaca citação que não está na Biblioteca, dado que não bate com o caso e formatação fora do padrão.', areas: null, precisa: ['claude'], usaModelo: false, semCusto: false },
  { agente: 'mensageira', nome: 'Mensageira', descricao: 'Escreve atualizações ao cliente em linguagem simples. Nada sai sem um clique da equipe.', areas: null, precisa: ['claude'], usaModelo: false, semCusto: false },
  { agente: 'intimacoes', nome: 'Leitor de intimações', descricao: 'Transforma publicações e movimentações em tarefas com prazo sugerido, para alguém da equipe conferir.', areas: null, precisa: ['claude'], usaModelo: false, semCusto: false },
  { agente: 'organizadora', nome: 'Organizadora de pastas', descricao: 'Nomeia arquivos com data aaaa_mm_dd e organiza documentos constitutivos e por benefício.', areas: null, precisa: [], usaModelo: false, semCusto: true },
  { agente: 'verbas', nome: 'Cálculo de verbas', descricao: 'Monta a planilha de verbas rescisórias a partir dos dados do contrato (fórmulas fixas, sem IA).', areas: ['trabalhista'], precisa: [], usaModelo: false, semCusto: true },
]
const CONFIG_AGENTES: Record<string, { ativo: boolean; etapas: string[]; modeloId: string | null; parametros: Record<string, unknown> }> = {}

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

const PACOTES_DEMO = [
  { slug: 'previdenciario', nome: 'Previdenciário', descricao: 'Roteiros de requerimentos, petições, quesitos, impugnações, réplica, recursos e análises.', areas: ['administrativo', 'judicial'], itens: 3, adicionados: 0, titulos: ['Requerimento de auxílio-acidente', 'Petição inicial de auxílio-acidente', 'Quesitos médicos de auxílio-acidente'] },
  { slug: 'trabalhista', nome: 'Trabalhista', descricao: 'Roteiros de inicial, verbas rescisórias, réplica, audiência e recursos.', areas: ['trabalhista'], itens: 2, adicionados: 0, titulos: ['Petição inicial de reclamação trabalhista', 'Recurso ordinário'] },
]
const PREPAROS = new Set<string>()
const DOS_PACOTES = new Map<string, Set<string>>()
const IGNORADOS = new Set<string>()
const RESOLVIDAS = new Set<number>()
const DUPLICADOS: ParDuplicado[] = [{ a: { id: 'c1', nome: 'Paulo Henrique Dias' }, b: { id: 'c9', nome: 'Paulo Henrique Dias' }, motivos: ['mesmo telefone', 'mesmo nome'] }]
const FALHAS: Falha[] = [{ id: 1, casoId: 'k3', cliente: 'Rosa Maria Lima', area: 'judicial', etapa: 'fazendo inicial', origem: 'Agente', detalhe: 'Agente interno não concluiu: modelo da petição não encontrado na Biblioteca', em: '2026-11-20T14:05:00Z' }]
let REGRAS_DEMO: RegrasAtencao = { ...REGRAS_PADRAO }

export function criarApiDemo(): Api {
  let logado = ler()
  let atual = 'demo-sp'
  const ouvintes = new Set<(v: boolean) => void>()
  const avisar = () => ouvintes.forEach((f) => f(logado))

  return {
    ...conversasDemo(),
    ...suporteDemo((id) => CLIENTES.find((c) => c.id === id)?.nome ?? null, (id) => [...PORTAIS.values()].some((p) => p.cliente === id) || id === 'c1'),
    async temSessao() { return logado },
    async entrar(_email, senha) {
      if (senha !== 'demo') throw new CredencialInvalida()
      logado = true; gravar(true); avisar()
    },
    async sair() { logado = false; gravar(false); avisar() },
    async criarSenhaPessoal(_email, mestra, nova) {
      if (mestra !== 'demo') throw new Error('Senha mestra incorreta, ou e-mail fora da equipe.')
      if (nova.trim().length < 8) throw new Error('Escolha uma senha mais forte.')
      logado = true; gravar(true); avisar()
    },
    aoMudarSessao(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn) },
    async perfil(): Promise<Perfil> {
      // a prévia pública mostra a Ana como Gestora; o acesso de Coder (Central, Adesões) só nas capturas do manual
      let coder = false
      try { coder = sessionStorage.getItem('hiadv-demo-coder') === '1' } catch { /* sem armazenamento */ }
      return { email: 'ana@silvaprado.exemplo.br', nome: 'Ana Prado', papel: coder ? 'code' : 'master', code: coder, escritorioId: atual, escritorioNome: ESCRITORIOS.find((e) => e.id === atual)!.nome }
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
        relato: RELATOS[id] ?? null,
        beneficio: AREAS_PREVIDENCIARIAS.includes(area) ? Object.fromEntries(BENEFICIO_DEFS.map((b) => [b.chave, BENEF[id]?.[b.chave] ?? null])) : null,
        checklist: CHECK.slice(0, n).map((r, i) => {
          const m = MARCADOS[id]?.[`i${i}`]
          const feito = m !== undefined ? m !== '' : i < c.gateOk
          return { item: `i${i}`, rotulo: r, feito, data: feito ? (m || dia(-3)) : null }
        }),
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
    async salvarBeneficio(id, dados) {
      const atual = (BENEF[id] ??= {})
      const mudou: string[] = []
      for (const [k, v] of Object.entries(dados)) {
        const d = BENEFICIO_DEFS.find((x) => x.chave === k)
        if (!d) throw new Error(`Campo "${k}" não pode ser editado aqui.`)
        if (k === 'uf' && v.trim() && !/^[A-Za-z]{2}$/.test(v.trim())) throw new Error('UF deve ter duas letras.')
        if (k === 'nb' && v.trim() && !/^[0-9./ -]{6,20}$/.test(v.trim())) throw new Error('NB deve ter só números (pode usar ponto e traço).')
        atual[k] = v.trim() === '' ? null : k === 'uf' ? v.trim().toUpperCase() : v.trim()
        mudou.push(d.rotulo)
      }
      if (mudou.length) (HIST[id] ??= []).unshift({ evento: 'beneficio', de: null, para: null, detalhe: `Atualizou: ${mudou.join(', ')}`, quem: 'Ana Prado', em: new Date().toISOString() })
      return mudou.length
    },
    async marcarChecklist(id, item, data) {
      (MARCADOS[id] ??= {})[item] = data ?? ''
      const c = CASOS.find((x) => x.id === id)
      if (c) c.gateOk = Math.max(0, Math.min(c.gateTotal, c.gateOk + (data ? 1 : -1)))
      ;(HIST[id] ??= []).unshift({ evento: 'checklist', de: item, para: data ?? 'desmarcado', detalhe: null, quem: 'Ana Prado', em: new Date().toISOString() })
    },
    async protocolar(id, numero, data) {
      const c = CASOS.find((x) => x.id === id)
      if (!c) throw new Error('Caso não encontrado.')
      const area = AREA_DO_CASO[id]
      const erro = validarProtocolo(area, numero, data, diaSP(new Date()))
      if (erro) throw new Error(erro)
      if (!(ETAPAS[area] ?? []).some((e) => e.status === 'protocolado')) throw new Error(`A via ${area} não tem a etapa protocolado.`)
      Object.assign((CAMPOS[id] ??= {}), { protocolo_numero: numero.trim(), protocolo_data: data })
      if (area === 'administrativo') (BENEF[id] ??= {}).protocolo_adm = numero.trim()
      if (area === 'judicial') c.numeroCnj = numero.trim()
      const de = c.status
      c.status = 'protocolado'; c.dias = 0
      const h = (HIST[id] ??= [])
      h.unshift({ evento: 'marco', de: 'protocolo', para: data, detalhe: numero.trim(), quem: 'Ana Prado', em: new Date().toISOString() })
      h.unshift({ evento: 'status', de, para: 'protocolado', detalhe: null, quem: 'Ana Prado', em: new Date().toISOString() })
    },
    async registrarExigencia(id, e) {
      const c = CASOS.find((x) => x.id === id)
      if (!c) throw new Error('Caso não encontrado.')
      const hoje = diaSP(new Date())
      const erro = validarExigencia(e, hoje)
      if (erro) throw new Error(erro)
      const interno = prazoInterno(e.prazoFatal, e.folga, hoje)
      tarefasDemo().push({ id: `t${Date.now()}`, titulo: `Cumprir exigência: ${c.cliente}`, detalhe: e.descricao.trim(), prazo: interno, fatal: true, responsavel: e.responsavel || 'ana.prado@silvaprado.exemplo.br', status: 'aberta' })
      const h = (HIST[id] ??= [])
      h.unshift({ evento: 'exigencia', de: null, para: e.prazoFatal, detalhe: e.descricao.trim(), quem: 'Ana Prado', em: new Date().toISOString() })
      const etapas = ETAPAS[AREA_DO_CASO[id]] ?? []
      const destino = etapaDeExigencia(etapas)
      if (destino && c.status !== destino && !etapas.find((x) => x.status === c.status)?.final) {
        h.unshift({ evento: 'status', de: c.status, para: destino, detalhe: 'Exigência registrada.', quem: 'Ana Prado', em: new Date().toISOString() })
        c.status = destino; c.dias = 0
      }
      return { interno, fatal: e.prazoFatal, status: destino }
    },
    async mudarVia(id, via, motivo) {
      const c = CASOS.find((x) => x.id === id)
      if (!c) throw new Error('Caso não encontrado.')
      if (via === AREA_DO_CASO[id]) throw new Error('Escolha uma via diferente da atual.')
      if (!(AREAS[atual] ?? []).some((a) => a.area === via)) throw new Error('Essa via não está ativa no escritório.')
      const novoId = `${id}-${via}`
      if (CASOS.some((x) => x.id === novoId)) return novoId
      const inicio = (ETAPAS[via] ?? [])[0]?.status
      if (!inicio) throw new Error(`A via ${via} não tem etapas.`)
      CASOS.push({ ...c, id: novoId, status: inicio, dias: 0, numeroCnj: via === 'judicial' ? null : c.numeroCnj })
      AREA_DO_CASO[novoId] = via
      const { protocolo_numero: _n, protocolo_data: _d, ...resto } = CAMPOS[id] ?? {}
      CAMPOS[novoId] = { ...resto }
      if (RELATOS[id]) RELATOS[novoId] = RELATOS[id]
      if (BENEF[id]) BENEF[novoId] = { ...BENEF[id] }
      const agora = new Date().toISOString()
      HIST[novoId] = [{ evento: 'criado', de: null, para: inicio, detalhe: `Aberto a partir do caso em ${AREA_DO_CASO[id]} · ${c.status}${motivo.trim() ? ` · ${motivo.trim()}` : ''}`, quem: 'Ana Prado', em: agora }]
      ;(HIST[id] ??= []).unshift({ evento: 'via', de: AREA_DO_CASO[id], para: via, detalhe: `Caso novo aberto em ${via}${motivo.trim() ? ` · ${motivo.trim()}` : ''}`, quem: 'Ana Prado', em: agora })
      return novoId
    },
    async equipe() { return EQUIPE.map((p) => ({ ...p })) },
    async tarefas(pessoa) {
      return tarefasDemo().filter((t) => t.status === 'aberta' && (!pessoa || t.responsavel === pessoa)).map(({ status: _s, ...t }) => ({ ...t }))
    },
    async criarTarefa(n) {
      if (n.titulo.trim().length < 2) throw new Error('Escreva o que precisa ser feito.')
      const pub = n.processoId ? PUBLICACOES.find((p) => p.processoId === n.processoId && !p.tarefa) : undefined
      if (pub) pub.tarefa = { id: `t${Date.now()}`, prazo: n.prazo || null, feita: false }
      tarefasDemo().push({ id: `t${Date.now()}`, titulo: n.titulo.trim(), detalhe: n.detalhe.trim() || null, prazo: n.prazo || null, fatal: false, responsavel: n.responsavel || null, status: 'aberta' })
    },
    async mudarTarefa(id, status) {
      const t = tarefasDemo().find((x) => x.id === id)
      if (!t) throw new Error('Tarefa não encontrada.')
      t.status = status
    },
    async clientes(termo) {
      const t = termo.trim().toLowerCase()
      return CLIENTES.filter((c) => t.length < 2 || c.nome.toLowerCase().includes(t)).sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => ({ ...c }))
    },
    async cliente(id) {
      const c = CLIENTES.find((x) => x.id === id)
      if (!c) throw new Error('Cliente não encontrado.')
      const casos = CASOS.filter((k) => CLIENTE_DO_CASO[k.id] === id).map((k) => ({ id: k.id, area: AREA_DO_CASO[k.id], status: k.status, produto: k.produto }))
      const processos = id === 'c2' ? [{ id: 'p2', numeroCnj: '0000123-45.2026.5.12.0001', classe: 'Ação trabalhista', orgao: '2ª Vara do Trabalho de Exemplo', ativo: true }] : []
      const tarefas = tarefasDemo().filter((t) => t.status === 'aberta' && t.detalhe?.includes(c.nome)).map(({ status: _s, ...t }) => ({ ...t }))
      return { cliente: { ...c }, casos, processos, tarefas }
    },
    async agenda(): Promise<Compromisso[]> {
      const x = (id: string, tipo: Compromisso['tipo'], titulo: string, cid: string, n: number, hora: string, local: string, quem: string): Compromisso =>
        ({ id, tipo, titulo, cliente: CLIENTES.find((c) => c.id === cid)!.nome, clienteId: cid, dia: dia(n), hora, local, quem })
      return [
        x('p1', 'pericia', 'Perícia médica', 'c1', 0, '09:30', 'Central de Perícias · Joaçaba', 'Ana'),
        x('a1', 'audiencia', 'Audiência inicial', 'c5', 0, '14:00', 'Virtual · 1ª Vara do Trabalho', 'Rafael'),
        x('a2', 'audiencia', 'Audiência de instrução', 'c7', 6, '10:00', '2ª Vara do Trabalho', 'Ana'),
        x('p2', 'pericia', 'Perícia médica', 'c3', 3, '13:15', 'JEF · sala 2', 'Ana'),
        x('p3', 'pericia', 'Perícia social', 'c8', 12, '08:00', 'Visita domiciliar', 'Júlia'),
      ]
    },
    async salvarRelato(id, relato) {
      if (relato.length > 20000) throw new Error('O relato passa de 20 mil caracteres.')
      RELATOS[id] = relato.trim()
      ;(HIST[id] ??= []).unshift({ evento: 'relato', de: null, para: null, detalhe: 'Atualizou o relato do cliente', quem: 'Ana Prado', em: new Date().toISOString() })
    },
    async biblioteca() { return BIBLIOTECA.map((b) => ({ ...b })) },
    async salvarBiblioteca(id, item, arquivo) {
      if (item.titulo.trim().length < 2) throw new Error('Dê um título.')
      if (!arquivo && !item.link.trim() && !item.conteudo.trim() && !id) throw new Error('Anexe um arquivo, cole o texto ou informe um link.')
      const base = { tipo: item.tipo, titulo: item.titulo.trim(), area: item.area || null, peca: item.peca.trim() || null, conteudo: item.conteudo || null, link: item.link.trim() || null }
      if (id) { const b = BIBLIOTECA.find((x) => x.id === id); if (b) Object.assign(b, base, arquivo ? { arquivoNome: arquivo.name, tamanho: arquivo.size } : {}) }
      else BIBLIOTECA.push({ id: `b${Date.now()}`, ...base, arquivo: null, arquivoNome: arquivo?.name ?? null, tamanho: arquivo?.size ?? null, criadoPor: 'ana@silvaprado.exemplo.br', criadoEm: new Date().toISOString() })
    },
    async retirarBiblioteca(id) { const i = BIBLIOTECA.findIndex((b) => b.id === id); if (i >= 0) BIBLIOTECA.splice(i, 1) },
    async linkArquivo() { throw new Error('Na demonstração os arquivos não são guardados.') },
    async integracoes() { return INTEGRACOES.map((i) => ({ ...i })) },
    async salvarIntegracao(servico, ativo, modo, limite) {
      const i = INTEGRACOES.find((x) => x.servico === servico)!
      if (ativo && servico !== 'google_drive' && !i.temChave) throw new Error('Cadastre a chave antes de ativar.')
      Object.assign(i, { ativo, modo: modo ?? i.modo, limiteMensal: limite ?? null, configuradoEm: new Date().toISOString(), configuradoPor: 'ana@silvaprado.exemplo.br' })
    },
    async salvarChave(servico, chave) {
      const c = chave.trim()
      if (c.length < 20 || /\s/.test(c)) throw new Error('A chave não parece válida.')
      if (servico === 'claude' && !c.startsWith('sk-ant-')) throw new Error('A chave da Claude começa com sk-ant-.')
      const i = INTEGRACOES.find((x) => x.servico === servico)!
      Object.assign(i, { temChave: true, chaveFinal: c.slice(-4), configuradoEm: new Date().toISOString(), configuradoPor: 'ana@silvaprado.exemplo.br' })
      return c.slice(-4)
    },
    async removerChave(servico) { Object.assign(INTEGRACOES.find((x) => x.servico === servico)!, { temChave: false, chaveFinal: null, ativo: false }) },
    async agentes() {
      const ativas = (AREAS[atual] ?? []).map((a) => a.area)
      return CATALOGO.filter((c) => !c.areas || c.areas.some((a) => ativas.includes(a))).map((c) => {
        const cfg = CONFIG_AGENTES[`${atual}:${c.agente}`] ?? { ativo: false, etapas: [], modeloId: null, parametros: {} }
        return { ...c, ...cfg, modeloTitulo: BIBLIOTECA.find((b) => b.id === cfg.modeloId)?.titulo ?? null }
      })
    },
    async configurarAgente(agente, ativo, etapas, modeloId, parametros) {
      const c = CATALOGO.find((x) => x.agente === agente)
      if (!c) throw new Error('Agente desconhecido.')
      if (ativo && ['organizadora', 'verbas'].includes(agente)) throw new Error('Este agente chega na próxima etapa do HiAdv.')
      if (ativo && c.semCusto && etapas.length === 0) throw new Error('Escolha ao menos uma etapa.')
      const dias = Number(parametros?.dias ?? 5)
      if (agente === 'acompanhamento' && (!Number.isInteger(dias) || dias < 1 || dias > 60)) throw new Error('Informe de 1 a 60 dias úteis.')
      const claude = INTEGRACOES[0]
      if (ativo && c.precisa.includes('claude') && !(claude.ativo && claude.temChave)) throw new Error('Ative a Claude em Integrações antes de ligar este agente.')
      if (ativo && c.usaModelo && !modeloId) throw new Error('Escolha o modelo da Biblioteca que este agente vai usar.')
      CONFIG_AGENTES[`${atual}:${agente}`] = { ativo, etapas, modeloId, parametros: agente === 'acompanhamento' ? { dias } : {} }
    },
    async atencao() {
      const hoje = diaSP(new Date())
      const dia = (n: number) => { const d = new Date(`${hoje}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
      const itens: ItemAtencao[] = []
      const fatal = tarefasDemo().find((t) => t.status === 'aberta' && t.fatal && t.prazo)
      if (fatal?.prazo) itens.push({ tipo: 'prazo', id: fatal.id, evento: null, titulo: fatal.titulo, detalhe: `Fatal ${fatal.prazo.slice(8, 10)}/${fatal.prazo.slice(5, 7)}`, dia: fatal.prazo, responsavel: fatal.responsavel, clienteId: null, casoId: null, gravidade: 'alta', escalado: fatal.responsavel !== 'ana.prado@silvaprado.exemplo.br' })
      const ignorar = REGRAS_DEMO.paradoIgnorar
      for (const c of CASOS) {
        if (c.dias >= REGRAS_DEMO.paradoDias && !ignorar.includes(c.status)) itens.push({ tipo: 'parado', id: c.id, evento: null, titulo: c.cliente, detalhe: `Em "${c.status}" há ${c.dias} dias`, dia: dia(-c.dias), responsavel: null, clienteId: null, casoId: c.id, gravidade: c.dias >= REGRAS_DEMO.paradoDias * 2 ? 'alta' : 'media', escalado: false })
      }
      if (!PREPAROS.has('pericia:demo-p1')) itens.push({ tipo: 'preparo', id: 'demo-p1', evento: 'pericia', titulo: 'Paulo Henrique Dias', detalhe: `Perícia ${dia(2).slice(8, 10)}/${dia(2).slice(5, 7)} às 09:30 · Justiça Federal — Joinville/SC`, dia: dia(2), responsavel: 'julia.costa@silvaprado.exemplo.br', clienteId: null, casoId: null, gravidade: 'media', escalado: true })
      return ordenarAtencao(itens)
    },
    async criarPreparo(evento, id) {
      const chave = `${evento}:${id}`
      const ja = PREPAROS.has(chave)
      const prazo = diaSP(new Date())
      if (!ja) {
        PREPAROS.add(chave)
        tarefasDemo().push({ id: `t-prep-${id}`, titulo: `Preparar ${evento === 'pericia' ? 'perícia' : 'audiência'}: Paulo Henrique Dias`, detalhe: 'Roteiro de preparação', prazo, fatal: false, responsavel: 'julia.costa@silvaprado.exemplo.br', status: 'aberta' })
      }
      return { ja, prazo }
    },
    async regrasAtencao() { return { ...REGRAS_DEMO, paradoIgnorar: [...REGRAS_DEMO.paradoIgnorar], rodizio: Object.fromEntries(Object.entries(REGRAS_DEMO.rodizio).map(([k, v]) => [k, [...v]])) } },
    async salvarRegrasAtencao(r) {
      const erro = validarRegras(r)
      if (erro) throw new Error(erro)
      REGRAS_DEMO = { ...r, paradoIgnorar: [...r.paradoIgnorar], rodizio: Object.fromEntries(Object.entries(r.rodizio).map(([k, v]) => [k, [...v]])) }
      return this.regrasAtencao()
    },
    async duplicados() { return DUPLICADOS.filter((p) => !IGNORADOS.has(`${p.a.id}|${p.b.id}`)).map((p) => ({ ...p, motivos: [...p.motivos] })) },
    async ignorarDuplicado(a, b) { const [x, y] = [a, b].sort(); IGNORADOS.add(`${x}|${y}`) },
    async cargaEquipe() {
      return EQUIPE.map((p) => {
        const tarefas = tarefasDemo().filter((t) => t.status === 'aberta' && t.responsavel === p.email).length
        return { email: p.email, nome: p.nome, tarefas, casos: 0, total: tarefas }
      }).sort((a, b) => a.total - b.total || a.email.localeCompare(b.email))
    },
    async publicacoes(dias, soPublicacoes) {
      const desde = Date.now() - dias * 864e5
      return PUBLICACOES.filter((p) => Date.parse(p.quando) >= desde && (!soPublicacoes || p.publicacao)).map((p) => ({ ...p }))
    },
    async oabs() { return { oabs: [...OABS_DEMO], daEquipe: [{ nome: 'Ana Prado', oab: 'OAB/SP 123.456' }] } },
    async salvarOabs(oabs) {
      const lista: string[] = []
      for (const o of oabs.filter((x) => x.trim())) {
        const n = oabTela(o); if (!n) throw new Error(`OAB "${o.slice(0, 30)}" não entendida. Use número e estado, por exemplo 12.345/SC.`)
        if (!lista.includes(n)) lista.push(n)
      }
      OABS_DEMO.splice(0, OABS_DEMO.length, ...lista)
      return lista
    },
    async calcularPrazo(p) {
      const erro = validarPrazo(p); if (erro) throw new Error(erro)
      const util = (d: Date) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6
      const d = new Date(p.inicio + 'T12:00:00Z')
      if (p.disponibilizacao) { do d.setUTCDate(d.getUTCDate() + 1); while (!util(d)) }
      const publicacao = d.toISOString().slice(0, 10)
      if (p.contagem === 'corridos') { d.setUTCDate(d.getUTCDate() + p.dias); while (!util(d)) d.setUTCDate(d.getUTCDate() + 1) }
      else { let k = 0; while (k < p.dias) { d.setUTCDate(d.getUTCDate() + 1); if (util(d)) k++ } }
      return { publicacao, fim: d.toISOString().slice(0, 10), coberturaAte: '2028-01-20', pulados: [] }
    },
    async finLista(de, ate) {
      return LANCAMENTOS.filter((l) => (l.vencimento >= de && l.vencimento <= ate) || (!l.pagoEm && l.vencimento < de)).map((l) => ({ ...l }))
    },
    async finLancar(l) {
      const erro = validarLancamento(l); if (erro) throw new Error(erro)
      const cli = CLIENTES.find((c) => c.id === l.cliente)
      LANCAMENTOS.push({ id: `l${Date.now()}`, sentido: l.sentido, etiqueta: l.etiqueta.trim() || (l.sentido === 'entrada' ? 'Honorários' : 'Despesas'), titulo: l.titulo.trim(), descricao: null,
        valor: lerValor(l.valor)!, vencimento: l.vencimento, pagoEm: l.pago ? l.vencimento : null, clienteId: cli?.id ?? null, cliente: cli?.nome ?? null, telefone: cli?.telefone ?? null, honorarioId: null })
    },
    async finBaixar(id, pagoEm) {
      const l = LANCAMENTOS.find((x) => x.id === id); if (!l) throw new Error('Lançamento não encontrado.')
      l.pagoEm = pagoEm
    },
    async honorarioCriar(h) {
      const erro = validarHonorario(h); if (erro) throw new Error(erro)
      const cli = CLIENTES.find((c) => c.id === h.cliente); if (!cli) throw new Error('Cliente não encontrado.')
      const id = `h${Date.now()}`
      HONORARIOS.push({ id, clienteId: cli.id, tipo: h.tipo, descricao: h.descricao.trim() || null, valorFixo: h.tipo === 'exito' ? null : lerValor(h.valorFixo), parcelas: h.tipo === 'exito' ? null : Number(h.parcelas), percentualExito: h.tipo === 'fixo' ? null : lerValor(h.percentualExito), status: 'ativo', criadoEm: new Date().toISOString() })
      if (h.tipo !== 'exito') {
        const ps = previaParcelas(lerValor(h.valorFixo)!, Number(h.parcelas), h.primeiroVencimento)
        ps.forEach((p, i) => LANCAMENTOS.push({ id: `${id}-${i}`, sentido: 'entrada', etiqueta: 'Honorários', titulo: `Parcela ${i + 1}/${ps.length} · ${cli.nome}`, descricao: null, valor: p.valor, vencimento: p.vencimento, pagoEm: null, clienteId: cli.id, cliente: cli.nome, telefone: cli.telefone, honorarioId: id }))
      }
    },
    async honorarioExito(id, valorRecebido) {
      const h = HONORARIOS.find((x) => x.id === id); if (!h?.percentualExito) throw new Error('Contrato com êxito não encontrado.')
      const cli = CLIENTES.find((c) => c.id === h.clienteId)!
      const v = Math.round(valorRecebido * h.percentualExito) / 100
      LANCAMENTOS.push({ id: `l${Date.now()}`, sentido: 'entrada', etiqueta: 'Honorários', titulo: `Êxito ${h.percentualExito}% · ${cli.nome}`, descricao: null, valor: v, vencimento: diaSP(new Date()), pagoEm: null, clienteId: cli.id, cliente: cli.nome, telefone: cli.telefone, honorarioId: id })
      return v
    },
    async honorariosCliente(clienteId) {
      const hoje = diaSP(new Date())
      return HONORARIOS.filter((h) => h.clienteId === clienteId).map(({ clienteId: _c, ...h }) => {
        const ls = LANCAMENTOS.filter((l) => l.honorarioId === h.id)
        const soma = (xs: typeof ls) => Math.round(xs.reduce((s, x) => s + x.valor, 0) * 100) / 100
        return { ...h, recebido: soma(ls.filter((l) => l.pagoEm)), aReceber: soma(ls.filter((l) => !l.pagoEm)), atrasado: soma(ls.filter((l) => !l.pagoEm && l.vencimento < hoje)) }
      })
    },
    async documentoDados(clienteId, casoId) {
      const c = CLIENTES.find((x) => x.id === clienteId); if (!c) throw new Error('Cliente não encontrado.')
      const caso = casoId ? CASOS.find((x) => x.id === casoId) : undefined
      return {
        cliente: { nome: c.nome, cpf: CPFS[c.id] ?? null, telefone: c.telefone, email: null, ...(DADOS_CLIENTE[c.id] ?? {}) },
        caso: caso ? { area: AREA_DO_CASO[caso.id] ?? 'trabalhista', produto: null, nb: null, dib: null, dcb: null, data_acidente: null, causa_acidente: null, sequela: null, profissao_epoca: null, uf: null, relato: RELATOS[caso.id] ?? null, processo: caso.numeroCnj } : null,
        escritorio: { nome: 'Silva & Prado Advocacia', cidade: 'São Paulo/SP', oabs: [...OABS_DEMO] },
        advogado: { nome: 'Ana Prado', oab: 'OAB/SP 123.456' },
      }
    },
    async salvarDadosCliente(clienteId, dados) {
      const atual = { ...(DADOS_CLIENTE[clienteId] ?? {}) } as Record<string, string>
      for (const [k, v] of Object.entries(dados)) { const t = String(v ?? '').trim(); if (t) atual[k] = t; else delete atual[k] }
      DADOS_CLIENTE[clienteId] = atual
    },
    async arquivoBiblioteca() { throw new Error('No modo demonstração os modelos em arquivo não são baixados. Use um modelo em texto.') },
    async relatorio(dias) {
      const mes = (n: number) => { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 7) }
      return {
        dias, casos: { abertos: CASOS.length, novos: 6, encerrados: 2 },
        etapas: [
          { area: 'administrativo', etapa: 'ag. docs do(a) cliente', casos: 3, media_dias: 14.5, maior_dias: 31 },
          { area: 'trabalhista', etapa: 'ag. audiência', casos: 2, media_dias: 9, maior_dias: 12 },
          { area: 'judicial', etapa: 'ag. perícia', casos: 2, media_dias: 5, maior_dias: 7 },
        ],
        ciclo: [{ area: 'administrativo', casos: 2, media_dias: 48 }],
        pessoas: [
          { email: 'ana@demo.hiadv', nome: 'Ana Prado', abertas: 6, atrasadas: 1, feitas: 14, no_prazo: 13, minutos: 1260, casos: 5 },
          { email: 'julia@demo.hiadv', nome: 'Júlia Costa', abertas: 9, atrasadas: 3, feitas: 21, no_prazo: 16, minutos: 2140, casos: 7 },
        ],
        atendimentos: { novos: LEADS.length + 9, contratou: 4, perdido: 3, em_aberto: LEADS.filter((l) => ['novo', 'conversa', 'proposta'].includes(l.etapa)).length,
          motivos: [{ motivo: 'Sem direito ao benefício', n: 2 }, { motivo: 'Parou de responder', n: 1 }] },
        clientes: { total: CLIENTES.length, novos: 4, origens: [{ origem: 'whatsapp', n: 3 }, { origem: 'indicação', n: 1 }] },
        prazos: { publicacoes: 12, cumpridos: 9, em_aberto: 3, vencidos: 0 },
        financeiro: { meses: [5, 4, 3, 2, 1, 0].map((n, i) => ({ mes: mes(n), recebido: 1500 + i * 400, pago: 600 + i * 50 })), em_atraso: 800, a_receber: 1300, clientes_em_atraso: 1 },
      }
    },
    async ativarArea(area, ativa) {
      const lista = AREAS[atual] ?? (AREAS[atual] = [])
      const i = lista.findIndex((a) => a.area === area)
      if (ativa && i < 0) lista.push({ area, nome: nomeDaArea(area), ordem: (lista.length + 1) * 10 })
      if (!ativa && i >= 0) lista.splice(i, 1)
      if (ativa && !ETAPAS[area]) ETAPAS[area] = [{ status: 'novo', ordem: 1, final: false, pedeMotivo: false }, { status: 'em andamento', ordem: 2, final: false, pedeMotivo: false }, { status: 'concluído', ordem: 3, final: true, pedeMotivo: false }]
    },
    async criarCliente(c) {
      const erro = validarCliente(c); if (erro) throw new Error(erro)
      const cpf = soDigitos(c.cpf)
      const ja = cpf ? CLIENTES.find((x) => CPFS[x.id] === cpf) : undefined
      if (ja) return { id: ja.id, ja: true }
      const id = `c${CLIENTES.length + 1}-${Date.now() % 100000}`
      CLIENTES.push({ id, nome: c.nome.replace(/\s+/g, ' ').trim(), telefone: soDigitos(c.telefone).replace(/^55(?=\d{10,11}$)/, '') || null, origem: 'equipe', desde: new Date().toISOString() })
      if (cpf) CPFS[id] = cpf
      return { id, ja: false }
    },
    async criarCaso(c) {
      const cli = CLIENTES.find((x) => x.id === c.cliente); if (!cli) throw new Error('Cliente não encontrado.')
      const etapas = ETAPAS[c.area]; if (!etapas?.length) throw new Error('Essa área não está ativa no escritório.')
      const id = `k${CASOS.length + 1}-${Date.now() % 100000}`
      const prod = areaPrevidenciaria(c.area) ? (PRODUTOS_PREV.find((p) => p.valor === c.produto)?.nome ?? 'Outro benefício') : (c.area === 'trabalhista' ? 'Reclamação trabalhista' : c.area)
      CASOS.push({ id, cliente: cli.nome, status: etapas[0].status, dias: 0, produto: prod, numeroCnj: null, gateOk: 0, gateTotal: 5 })
      AREA_DO_CASO[id] = c.area; CLIENTE_DO_CASO[id] = cli.id
      if (c.relato.trim()) RELATOS[id] = c.relato.trim()
      return id
    },
    async importarClientes(itens, simular) {
      const vistos = new Set<string>(); let novos = 0, existentes = 0, erros = 0
      const linhas = itens.map((it, i) => {
        const erro = validarCliente(it); const cpf = soDigitos(it.cpf)
        let resultado: 'novo' | 'ja' | 'erro' = 'novo'; let motivo: string | null = null
        if (erro) { resultado = 'erro'; motivo = erro === 'Informe o nome.' ? 'Nome em branco ou curto demais.' : erro }
        else if (cpf && vistos.has(cpf)) { resultado = 'erro'; motivo = 'CPF repetido na planilha.' }
        else if (cpf && CLIENTES.some((x) => CPFS[x.id] === cpf)) resultado = 'ja'
        if (cpf) vistos.add(cpf)
        if (resultado === 'novo') novos++; else if (resultado === 'ja') existentes++; else erros++
        return { linha: i + 1, nome: it.nome.trim(), resultado, motivo }
      })
      if (!simular) for (const [i, l] of linhas.entries()) if (l.resultado === 'novo') await this.criarCliente(itens[i])
      return { simulado: simular, novos, existentes, erros, linhas }
    },
    async leads() { return LEADS.map((l) => ({ ...l })) },
    async salvarLead(id, l) {
      const m = validarLead(l); if (m) throw new Error(m)
      const dados = { nome: l.nome.trim(), telefone: l.telefone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '') || null, origem: l.origem || null, area: l.area || null,
        assunto: l.assunto.trim() || null, responsavel: l.responsavel || null, proximoContato: l.proximoContato || null }
      if (id) { const x = LEADS.find((y) => y.id === id); if (!x) throw new Error('Atendimento não encontrado.'); Object.assign(x, dados); return id }
      const novoId = `ld${Date.now()}`
      LEADS.unshift({ id: novoId, ...dados, responsavel: dados.responsavel ?? 'ana@silvaprado.exemplo.br', etapa: 'novo', motivoPerda: null, clienteId: null, criadoEm: new Date().toISOString() })
      return novoId
    },
    async etapaLead(id, etapa, motivo) {
      const x = LEADS.find((y) => y.id === id); if (!x || x.etapa === 'contratou') throw new Error('Atendimento não encontrado ou já contratado.')
      if (etapa === 'perdido' && (motivo ?? '').trim().length < 2) throw new Error('Diga o motivo.')
      x.etapa = etapa; x.motivoPerda = etapa === 'perdido' ? motivo!.trim() : null
    },
    async converterLead(id, area, produto) {
      const x = LEADS.find((y) => y.id === id); if (!x) throw new Error('Atendimento não encontrado.')
      const cli = await this.criarCliente({ nome: x.nome, telefone: x.telefone ?? undefined })
      const caso = await this.criarCaso({ cliente: cli.id, area, produto, relato: x.assunto ?? '', responsavel: x.responsavel })
      x.etapa = 'contratou'; x.clienteId = cli.id
      return { cliente: cli.id, caso }
    },
    async horasCliente(clienteId) { return HORAS.filter((h) => h.cliente === clienteId).map(({ cliente: _c, ...h }) => ({ ...h })) },
    async lancarHoras(h) {
      if (!h.minutos || h.minutos < 1 || h.minutos > 1440) throw new Error('Informe de 1 minuto a 24 horas.')
      if (h.dia > hojeDemo()) throw new Error('Data no futuro.')
      HORAS.unshift({ id: `hr${Date.now()}`, email: 'ana@silvaprado.exemplo.br', nome: 'Ana Prado', descricao: h.descricao.trim() || null, dia: h.dia, minutos: h.minutos, minha: true, cliente: h.cliente ?? '' })
    },
    async removerHoras(id) { const i = HORAS.findIndex((h) => h.id === id); if (i < 0) throw new Error('Registro não encontrado.'); HORAS.splice(i, 1) },
    async portalGerar(clienteId) {
      for (const [t, p] of PORTAIS) if (p.cliente === clienteId) PORTAIS.delete(t)
      const token = Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      const expira = new Date(Date.now() + 90 * 864e5).toISOString()
      PORTAIS.set(token, { cliente: clienteId, expira, acessos: 0 })
      return { token, expiraEm: expira }
    },
    async portalSituacao(clienteId) {
      const p = [...PORTAIS.values()].find((x) => x.cliente === clienteId)
      return p ? { ativo: true, expiraEm: p.expira, acessos: p.acessos, ultimoAcesso: null } : { ativo: false, expiraEm: null, acessos: 0, ultimoAcesso: null }
    },
    async portalRevogar(clienteId) { for (const [t, p] of PORTAIS) if (p.cliente === clienteId) PORTAIS.delete(t) },
    async portal(token) {
      const p = PORTAIS.get(token)
      if (!p) return null
      p.acessos++
      const cli = CLIENTES.find((c) => c.id === p.cliente)
      return {
        escritorio: { nome: 'Silva & Prado Advocacia', whatsapp: contatoDemo.whatsapp }, cliente: (cli?.nome ?? '').split(' ')[0], expiraEm: p.expira,
        casos: [{ area: 'Previdenciário administrativo', fase: 'Aguardando os seus documentos', desde: hojeDemo(), concluido: false }],
        compromissos: [{ tipo: 'Perícia', quando: new Date(Date.now() + 6 * 864e5).toISOString(), local: 'Agência do INSS de Joaçaba' }],
      }
    },
    async contatoEscritorio() { return { nome: 'Silva & Prado Advocacia', ...contatoDemo } },
    async salvarContatoEscritorio(cidade, whatsapp) {
      let w = whatsapp.replace(/\D/g, ''); if (w.length >= 12 && w.startsWith('55')) w = w.slice(2)
      if (w && !/^\d{10,11}$/.test(w)) throw new Error('WhatsApp com DDD e número.')
      contatoDemo = { cidade: cidade.trim() || null, whatsapp: w || null }
    },
    async agendaLinkGerar() { agendaDemo = true; return `https://exemplo.supabase.co/functions/v1/agenda?t=${'d'.repeat(64)}` },
    async agendaLinkExiste() { return agendaDemo },
    async vagas() { return VAGAS.map((v) => ({ ...v })) },
    async vagaSalvar(v) {
      const m = validarVaga(v); if (m) throw new Error(m)
      const atual = v.id ? VAGAS.find((x) => x.id === v.id) : undefined
      if (atual) { Object.assign(atual, { ...v, titulo: v.titulo.trim() }); return atual.id }
      const base = v.titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vaga'
      let slug = base, n = 1; while (VAGAS.some((x) => x.slug === slug)) slug = `${base}-${++n}`
      const nova: Vaga = { ...v, titulo: v.titulo.trim(), id: `vg${Date.now()}`, slug, escritorioSlug: 'silva-prado-advocacia', status: 'rascunho', total: 0, novos: 0, criadoEm: new Date().toISOString() }
      VAGAS.unshift(nova); return nova.id
    },
    async vagaStatus(id, status) { const v = VAGAS.find((x) => x.id === id); if (!v) throw new Error('Vaga não encontrada.'); v.status = status },
    async candidaturas(vaga) { return CANDIDATOS.filter((c) => c.vaga === vaga).map(({ vaga: _v, ...c }) => ({ ...c })) },
    async candidaturaAtualizar(id, m) {
      const c = CANDIDATOS.find((x) => x.id === id); if (!c) throw new Error('Candidatura não encontrada.')
      if (m.etapa === 'banco' && !c.bancoTalentos) throw new Error('Este candidato não aceitou ficar no banco de talentos.')
      if (m.nota !== undefined && (m.nota < 1 || m.nota > 5)) throw new Error('A nota vai de 1 a 5.')
      if (m.etapa) c.etapa = m.etapa; if (m.nota !== undefined) c.nota = m.nota; if (m.obs !== undefined) c.obs = m.obs.trim() || null
      contarVaga(c.vaga)
    },
    async candidaturaApagar(id) { const i = CANDIDATOS.findIndex((x) => x.id === id); if (i < 0) throw new Error('Candidatura não encontrada.'); const [c] = CANDIDATOS.splice(i, 1); contarVaga(c.vaga) },
    async curriculoLink() { throw new Error('Na demonstração não há currículos salvos.') },
    async entrevistaSalvar(id, e) {
      const c = CANDIDATOS.find((x) => x.id === id); if (!c) throw new Error('Candidatura não encontrada.')
      const m = validarEntrevista(e); if (m) throw new Error(m)
      c.entrevista = { ...e }; if (['recebido', 'triagem', 'teste'].includes(c.etapa)) c.etapa = 'entrevista'; c.token ??= `demo${id}`.padEnd(36, '0'); contarVaga(c.vaga)
    },
    async propostaSalvar(id, p) {
      const c = CANDIDATOS.find((x) => x.id === id); if (!c) throw new Error('Candidatura não encontrada.')
      const m = validarProposta(p); if (m) throw new Error(m)
      c.proposta = { ...p }; if (c.etapa !== 'contratado') c.etapa = 'proposta'; c.token ??= `demo${id}`.padEnd(36, '0'); contarVaga(c.vaga)
    },
    async respostaVer(token) {
      const c = CANDIDATOS.find((x) => x.token === token); if (!c) return null
      return { nome: c.nome.split(' ')[0], escritorio: 'Silva & Prado Advocacia', vaga: VAGAS.find((v) => v.id === c.vaga)?.titulo ?? '', entrevista: c.entrevista ?? null, proposta: c.proposta ?? null, resposta: c.resposta ?? null, etapa: c.etapa }
    },
    async respostaEnviar(token, tipo, msg) {
      const c = CANDIDATOS.find((x) => x.token === token); if (!c) throw new Error('Link inválido.')
      if (tipo === 'outro_horario' && !msg.trim()) throw new Error('Diga quais dias e horários ficam melhores.')
      c.resposta = { tipo, msg: msg.trim() || null, em: new Date().toISOString() }; if (tipo === 'aceitar') c.etapa = 'contratado'
    },
    async vagaPublica(esc, slug) {
      const v = VAGAS.find((x) => x.escritorioSlug === esc && x.slug === slug && x.status !== 'rascunho'); if (!v) return null
      return { ...v, escritorio: 'Silva & Prado Advocacia', cidadeEscritorio: 'Joaçaba', aberta: v.status === 'aberta', salario: v.mostrarSalario ? v.salario : null }
    },
    async candidaturaEnviar(vaga, f) {
      const v = VAGAS.find((x) => x.id === vaga); if (!v || v.status !== 'aberta') throw new Error('Esta vaga não está recebendo inscrições.')
      const m = validarCandidatura(f, v.perguntas); if (m) throw new Error(m)
      if (CANDIDATOS.some((c) => c.vaga === vaga && c.email === f.email.trim().toLowerCase())) throw new Error('Já recebemos uma inscrição com este e-mail para esta vaga.')
      CANDIDATOS.unshift({ id: `cd${Date.now()}`, vaga, nome: f.nome.trim(), email: f.email.trim().toLowerCase(), whatsapp: f.whatsapp.replace(/\D/g, ''), cidade: f.cidade || null, uf: f.uf || null,
        linkedin: f.linkedin || null, curriculoPath: null, respostas: f.respostas, bancoTalentos: f.bancoTalentos, etapa: 'recebido', nota: null, obs: null, criadoEm: new Date().toISOString() })
      contarVaga(vaga)
    },
    async adesaoVagas() { return 20 - ADESOES.filter((a) => a.fundador && a.status === 'ativada').length },
    async adesaoEnviar(p) {
      const m = validarAdesao(p); if (m) throw new Error(m)
      const ref = p.ref?.toUpperCase() === CODIGO_DEMO
      ADESOES.unshift({ id: `ad${Date.now()}`, nome: p.nome.trim(), email: p.email.trim().toLowerCase(), whatsapp: p.whatsapp.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, ''),
        oab: p.oab || null, escritorio: p.escritorio || null, cidade: p.cidade || null, uf: p.uf.toUpperCase() || null, plano: p.plano, recomendado: p.recomendado, respostas: p.respostas,
        indicadorEmail: ref ? 'ana@silvaprado.exemplo.br' : null, indicadorEscritorio: ref ? 'Silva & Prado Advocacia' : null, status: 'nova', fundador: false, cortesia: 'nenhuma', obs: null, criadoEm: new Date().toISOString() })
      return { lista: p.plano === 'supremo' || p.plano === 'senior' }
    },
    async indicacaoCodigo() { return CODIGO_DEMO },
    async indicacoes() {
      return ADESOES.filter((a) => a.indicadorEmail).map((a) => ({ id: a.id, primeiroNome: a.nome.split(' ')[0], plano: a.plano, status: a.status, cortesia: a.cortesia, criadoEm: a.criadoEm, quem: a.indicadorEmail, minha: true }))
    },
    async adesoes() { return ADESOES.map((a) => ({ ...a })) },
    async adesaoAtualizar(id, status, extra) {
      const a = ADESOES.find((x) => x.id === id); if (!a) throw new Error('Pedido não encontrado.')
      if (status === 'ativada' && (a.plano === 'supremo' || a.plano === 'senior')) throw new Error('O Sênior ainda não está liberado: ative em outro plano ou mantenha na lista.')
      a.status = status; if (extra?.fundador !== undefined) a.fundador = extra.fundador
      if (extra?.cortesia) a.cortesia = extra.cortesia; else if (status === 'ativada' && a.indicadorEmail && a.cortesia === 'nenhuma') a.cortesia = 'pendente'
      if (extra?.obs !== undefined) a.obs = extra.obs.trim() || null
    },
    async adesaoPlano(id, plano) { const a = ADESOES.find((x) => x.id === id); if (!a) throw new Error('Pedido não encontrado.'); a.plano = plano },
    async meusRecursos() { return null },
    async centralEscritorios() { return CENTRAL.map(({ detalhe: _d, ...e }) => ({ ...e, limites: { ...e.limites }, uso: { ...e.uso } })) },
    async centralEscritorio(id) { const e = CENTRAL.find((x) => x.id === id); if (!e) throw new Error('Escritório não encontrado.'); return JSON.parse(JSON.stringify(e.detalhe)) },
    async centralAssinatura(id, f) {
      const e = CENTRAL.find((x) => x.id === id); if (!e) throw new Error('Escritório não encontrado.')
      Object.assign(e, { plano: f.plano, situacao: f.situacao, fundador: f.fundador, testeAte: f.testeAte || null, pagoAte: f.pagoAte || null, obs: f.obs.trim() || null })
      e.detalhe.historico.unshift({ quando: new Date().toISOString(), quem: 'demonstração', acao: `plano ${f.plano}, ${f.situacao}` }); recalcular(e)
    },
    async centralAjuste(id, recurso, valor, validoAte) {
      const e = CENTRAL.find((x) => x.id === id); if (!e) throw new Error('Escritório não encontrado.')
      e.detalhe.ajustes = e.detalhe.ajustes.filter((a) => a.recurso !== recurso)
      if (valor !== 'plano') e.detalhe.ajustes.push({ recurso, valor, validoAte })
      recalcular(e)
    },
    async pessoaAjuste(id, email, recurso, bloquear, validoAte) {
      const e = CENTRAL.find((x) => x.id === id); const p = e?.detalhe.pessoas.find((x) => x.email === email); if (!p) throw new Error('Pessoa não encontrada neste escritório.')
      p.bloqueios = p.bloqueios.filter((b) => b.recurso !== recurso); if (bloquear) p.bloqueios.push({ recurso, validoAte })
    },
    async iaGerar(p) {
      const { mensagem } = montarPedidoIA(p)
      await new Promise((r) => setTimeout(r, 400))
      return `Rascunho de demonstração (${p.acao}). Na versão real, este texto é escrito pela IA com a chave da Claude do escritório e chega aqui para você revisar.\n\nO pedido enviado teria ${mensagem.length} caracteres.`
    },
    async iaUsoMes() { return { usados: 3, limite: 300 } },
    async iaAvaliar(acao, pedido, util, comoQueria) {
      if (!util && comoQueria.trim()) demoIA.pendentes.unshift({ id: ++demoIA.seq, quem: 'voce@demo.hiadv', acao, pedido: pedido.slice(0, 600), comoQueria: comoQueria.trim(), em: new Date().toISOString() })
      if (util) demoIA.resumo.uteis++; else demoIA.resumo.naoUteis++
    },
    async iaAprendizado() { return structuredClone({ pendentes: demoIA.pendentes, orientacoes: demoIA.orientacoes, resumo: demoIA.resumo }) },
    async iaOrientacaoSalvar(id, acao, texto, feedbackId) {
      const erro = problemaOrientacao(texto); if (erro) throw new Error(erro)
      if (id) { const o = demoIA.orientacoes.find((x) => x.id === id); if (!o) throw new Error('Orientação não encontrada.'); o.texto = texto.trim(); o.acao = acao; return id }
      if (demoIA.orientacoes.filter((o) => o.ativo).length >= MAX_ORIENTACOES) throw new Error('O escritório já tem 40 orientações ligadas. Desligue alguma antes de criar outra.')
      const nid = ++demoIA.seq
      demoIA.orientacoes.unshift({ id: nid, acao, texto: texto.trim(), ativo: true, usos: 0, criadoPor: 'voce@demo.hiadv', em: new Date().toISOString() })
      if (feedbackId) demoIA.pendentes = demoIA.pendentes.filter((f) => f.id !== feedbackId)
      return nid
    },
    async iaOrientacaoAtiva(id, ativo) { const o = demoIA.orientacoes.find((x) => x.id === id); if (o) o.ativo = ativo },
    async iaFeedbackRecusar(id) { demoIA.pendentes = demoIA.pendentes.filter((f) => f.id !== id) },
    async configGoogle() { return { cfg: null, driveLigado: false } },
    async configGoogleSalvar() { throw new Error('Na demonstração a configuração do Google não é salva.') },
    async centralNovo(n) {
      const erro = validarNovo(n); if (erro) throw new Error(erro)
      const id = 'demo-' + (CENTRAL.length + 1)
      const e = { id, nome: n.nome.trim(), cidade: n.cidade.trim() || null, ativo: true, oabsMaster: n.oab.trim() ? [n.oab.trim()] : [], plano: n.plano, situacao: 'teste' as const, fundador: n.fundador,
        testeAte: null, pagoAte: null, obs: null, limites: { masters: null, colaboradores: null, oabs: null, iaMensal: null }, uso: { masters: 1, colaboradores: 0, oabs: n.oab.trim() ? 1 : 0, iaMes: 0 }, ajustes: 0,
        detalhe: { ajustes: [], recursos: [], pessoas: [{ email: n.masterEmail.trim().toLowerCase(), nome: n.masterNome.trim(), papel: 'master', bloqueios: [] }], historico: [] } }
      CENTRAL.push(e); recalcular(e); return id
    },
    async centralPainel() {
      const h = new Date(); const fim = new Date(h.getFullYear(), h.getMonth() + 1, 0).getDate()
      const dias = Array.from({ length: fim }, (_, i) => ({ dia: i + 1, recebido: PAGAMENTOS_DEMO.filter((p) => +p.pagoEm.slice(8, 10) === i + 1 && p.pagoEm.slice(0, 7) === h.toISOString().slice(0, 7)).reduce((a, p) => a + p.valor, 0), previsto: 0 }))
      const ym = h.toISOString().slice(0, 7)
      return { inicio: `${ym}-01`, fim: `${ym}-${String(fim).padStart(2, '0')}`, dias, recebido: dias.reduce((a, d) => a + d.recebido, 0),
        previsto: CENTRAL.filter((e) => e.situacao === 'ativo' || e.situacao === 'atraso').reduce((a, e) => a + (e.preco ?? 0), 0),
        emAtraso: CENTRAL.filter((e) => e.situacao === 'atraso').reduce((a, e) => a + (e.preco ?? 0), 0) }
    },
    async centralPagamento(id, valor, pagoEm, forma) {
      const e = CENTRAL.find((x) => x.id === id); if (!e) throw new Error('Escritório não encontrado.')
      if (!(valor > 0)) throw new Error('Valor inválido.')
      const base = e.pagoAte ?? pagoEm; const d = new Date(base + 'T12:00:00'); d.setMonth(d.getMonth() + 1)
      e.pagoAte = d.toISOString().slice(0, 10); if (e.situacao !== 'suspenso') e.situacao = 'ativo'
      PAGAMENTOS_DEMO.unshift({ competencia: base, valor, pagoEm, forma })
      e.detalhe.historico.unshift({ quando: new Date().toISOString(), quem: 'demonstração', acao: `registrou pagamento de R$ ${valor.toFixed(2).replace('.', ',')} (${forma})` })
      return e.pagoAte
    },
    async centralPagamentos() { return PAGAMENTOS_DEMO.map((p) => ({ ...p })) },
    async centralMotivo(id, texto) {
      const e = CENTRAL.find((x) => x.id === id); if (!e) throw new Error('Escritório não encontrado.')
      if (texto.trim().length < 3) throw new Error('Informe o motivo.')
      e.detalhe.historico.unshift({ quando: new Date().toISOString(), quem: 'demonstração', acao: `motivo: ${texto.trim()}` })
    },
    async falhas() { return FALHAS.filter((f) => !RESOLVIDAS.has(f.id)).map((f) => ({ ...f })) },
    async resolverFalha(id) { RESOLVIDAS.add(id) },
    async pacotes() {
      return PACOTES_DEMO.map((p) => ({ ...p, titulos: [...p.titulos], adicionados: (DOS_PACOTES.get(p.slug)?.size ?? 0) }))
    },
    async adicionarPacote(slug) {
      const p = PACOTES_DEMO.find((x) => x.slug === slug)
      if (!p) throw new Error('Pacote não encontrado.')
      let n = 0
      for (const t of p.titulos) {
        const ja = DOS_PACOTES.get(slug) ?? new Set<string>()
        if (ja.has(t)) continue
        ja.add(t); DOS_PACOTES.set(slug, ja)
        BIBLIOTECA.push({ id: `pk-${slug}-${n}-${Date.now()}`, tipo: 'modelo', titulo: t, area: p.areas[0] ?? null, peca: 'Roteiro', conteudo: 'Roteiro de exemplo.', link: null, arquivo: null, arquivoNome: null, tamanho: null, criadoPor: 'ana@silvaprado.exemplo.br', criadoEm: new Date().toISOString() })
        n++
      }
      return n
    },
    async etapasDoEscritorio() {
      return (AREAS[atual] ?? []).flatMap((a) => (ETAPAS[a.area] ?? []).filter((e) => !e.final).map((e) => ({ area: a.area, areaNome: a.nome, status: e.status })))
    },
  }
}
