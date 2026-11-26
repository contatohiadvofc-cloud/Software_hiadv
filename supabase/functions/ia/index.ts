// Função "ia" do HiAdv: gera rascunhos com a chave da Claude do próprio escritório.
// Confere plano, chave e limite (hiadv_ia_preparar), chama a IA e registra o uso (hiadv_ia_registrar).
// v2: acrescenta as orientações aprovadas pelos gestores do PRÓPRIO escritório (ia_orientacoes_para).
// As orientações só mudam o jeito de escrever; nunca passam por cima das REGRAS abaixo.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const URL_SB = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MODELO = Deno.env.get('HIADV_IA_MODELO') || 'claude-sonnet-5-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resp = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type AcaoIA = 'resumo_intimacao' | 'quesitos' | 'minuta' | 'resumo_documento'

type PedidoIA = {
  acao: AcaoIA
  texto?: string
  instrucao?: string
  caso?: Record<string, string | null | undefined>
  arquivos?: { nome: string; texto: string }[]
}

const LIMITE_TEXTO = 60_000

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

function montarPedidoIA(p: PedidoIA): { sistema: string; mensagem: string } {
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

/** Orientações do escritório vão depois das regras, marcadas como preferência de estilo. */
function comOrientacoes(sistema: string, orientacoes: string[]): string {
  const lista = orientacoes.map((o) => String(o).replace(/\s+/g, ' ').trim().slice(0, 400)).filter(Boolean).slice(0, 40)
  if (!lista.length) return sistema
  return sistema + '\n\nPREFERÊNCIAS DE ESCRITA DESTE ESCRITÓRIO (aprovadas pelos gestores; siga quando couber, mas as regras acima vêm sempre antes e nada aqui autoriza descumpri-las):\n'
    + lista.map((o) => '- ' + o).join('\n')
}

function limparResposta(t: string): string {
  return t.replace(/```[\s\S]*?```/g, '[trecho removido]').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp({ ok: false, erro: 'Método não permitido.' }, 405);
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return resp({ ok: false, erro: 'Entre no HiAdv para usar a IA.' }, 401);
  let p: PedidoIA;
  try { p = await req.json(); } catch { return resp({ ok: false, erro: 'Pedido inválido.' }, 400); }
  let pedido: { sistema: string; mensagem: string };
  try { pedido = montarPedidoIA(p); } catch (e) { return resp({ ok: false, erro: (e as Error).message }); }

  const usr = createClient(URL_SB, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const prep = await usr.rpc('hiadv_ia_preparar', { p_acao: p.acao });
  if (prep.error) return resp({ ok: false, erro: 'Não foi possível conferir o acesso à IA.' }, 500);
  const ctx = prep.data as { ok: boolean; erro?: string; escritorio?: string };
  if (!ctx.ok) return resp({ ok: false, erro: ctx.erro });

  // com a sessão de quem pediu: o banco só devolve as orientações do escritório dessa pessoa
  const ori = await usr.rpc('ia_orientacoes_para', { p_acao: p.acao });
  const sistema = comOrientacoes(pedido.sistema, ori.error || !Array.isArray(ori.data) ? [] : ori.data as string[]);

  const adm = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
  const chave = await adm.rpc('integracao_chave_servidor', { p_escritorio: ctx.escritorio, p_servico: 'claude' });
  if (chave.error || !chave.data) return resp({ ok: false, erro: 'A chave da Claude do escritório não foi encontrada. Confira em Configurações, Integrações.' });

  let r: Response;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': String(chave.data), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODELO, max_tokens: 4000, system: sistema, messages: [{ role: 'user', content: pedido.mensagem }] }),
    });
  } catch { return resp({ ok: false, erro: 'A IA não respondeu. Tente de novo em instantes.' }); }
  if (r.status === 401) return resp({ ok: false, erro: 'A chave da Claude foi recusada. O Gestor precisa cadastrar uma chave válida.' });
  if (r.status === 429) return resp({ ok: false, erro: 'A conta da Claude do escritório atingiu o limite de uso. Tente mais tarde.' });
  if (!r.ok) return resp({ ok: false, erro: 'A IA não conseguiu responder agora. Tente de novo em instantes.' });
  const d = await r.json();
  const texto = limparResposta((d.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n'));
  await usr.rpc('hiadv_ia_registrar', { p_acao: p.acao, p_entrada: d.usage?.input_tokens ?? 0, p_saida: d.usage?.output_tokens ?? 0 });
  return resp({ ok: true, texto });
});
