// Lanhi Advogados / HiAdv - funcao consultar-processo (v12: OABs por escritório)
import { createClient } from 'jsr:@supabase/supabase-js@2';

const URL_SB = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CHAVE_PADRAO = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
let DATAJUD_KEY = (Deno.env.get('DATAJUD_API_KEY') || CHAVE_PADRAO).split(' ').pop()!.trim();
let chaveRenovadaEm = 0;
// O CNJ pode trocar a chave publica a qualquer momento: busca a vigente na pagina oficial (no maximo 1 vez por hora).
async function renovarChaveDatajud(): Promise<boolean> {
  if (Date.now() - chaveRenovadaEm < 36e5) return false;
  chaveRenovadaEm = Date.now();
  for (const url of ['https://datajud-wiki.cnj.jus.br/api-publica/acesso', 'https://datajud-wiki.cnj.jus.br/api-publica/']) {
    try {
      const r = await comTempo(url, { headers: { Accept: 'text/html' } }, 8000);
      if (!r.ok) continue;
      const html = await r.text();
      let i = html.indexOf('APIKey ');
      while (i >= 0) {
        let j = i + 7, k = '';
        const ok = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        while (j < html.length && ok.indexOf(html[j]) >= 0) { k += html[j]; j++; }
        if (k.length >= 30 && k !== DATAJUD_KEY) { DATAJUD_KEY = k; return true; }
        i = html.indexOf('APIKey ', j);
      }
    } catch (_) { /* tenta a proxima */ }
  }
  return false;
}
const OABS = ['30297', '30.297', '37550', '37.550'];
// HiAdv: cada escritório consulta o DJEN com as próprias OABs (cadastro do escritório + advogados Master)
const LANHI = '00000000-0000-4000-8000-00000000a001';
type Oab = { num: string; uf: string };
const OABS_LANHI: Oab[] = [{ num: '30297', uf: 'SC' }, { num: '37550', uf: 'SC' }];
const UFS = /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/;
function lerOab(t: unknown, ufPadrao = 'SC'): Oab | null {
  const s = String(t ?? '').toUpperCase();
  const uf = (s.match(UFS) || [])[1] || ufPadrao;
  const num = digitos(s.replace(/\b[A-Z]{2,}\b/g, ''));
  return num.length >= 3 ? { num, uf } : null;
}
let cacheOabs: { em: number; m: Map<string, Oab[]> } | null = null;
async function oabsPorEscritorio(adm: any): Promise<Map<string, Oab[]>> {
  if (cacheOabs && Date.now() - cacheOabs.em < 10 * 60e3) return cacheOabs.m;
  const m = new Map<string, Oab[]>([[LANHI, OABS_LANHI]]);
  const { data, error } = await adm.rpc('hiadv_oabs_escritorios');
  if (!error) for (const x of (data || []) as any[]) {
    if (!x?.escritorio || x.escritorio === LANHI) continue;
    const l = ((x.oabs || []) as string[]).map((o) => lerOab(o)).filter(Boolean) as Oab[];
    m.set(String(x.escritorio), [...new Map(l.map((o) => [o.uf + o.num, o])).values()]);
  }
  cacheOabs = { em: Date.now(), m };
  return m;
}
async function oabsDo(adm: any, esc: string | null | undefined): Promise<Oab[]> {
  if (!esc || esc === LANHI) return OABS_LANHI;
  return (await oabsPorEscritorio(adm)).get(esc) || [];
}
const comPonto = (n: string) => n.length > 3 ? n.slice(0, -3) + '.' + n.slice(-3) : n;
function temOab(item: any, oabs: Oab[]) {
  const t = JSON.stringify(item?.destinatarioadvogados ?? item?.advogados ?? item);
  return oabs.some((o) => t.includes(o.num) || t.includes(comPonto(o.num)));
}
function digitos(v: unknown) { let r = ''; for (const ch of String(v ?? '')) if (ch >= '0' && ch <= '9') r += ch; return r; }
const LIMITE_HORA = 20;          // consultas novas por cliente por hora
const ATUALIZA_HORAS = 6;        // intervalo mínimo entre atualizações de um processo

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resp = (o: unknown) => new Response(JSON.stringify(o), { headers: { ...CORS, 'Content-Type': 'application/json' } });

const UF: Record<number, string> = { 1:'ac',2:'al',3:'ap',4:'am',5:'ba',6:'ce',7:'dft',8:'es',9:'go',10:'ma',11:'mt',12:'ms',13:'mg',14:'pa',15:'pb',16:'pr',17:'pe',18:'pi',19:'rj',20:'rn',21:'rs',22:'ro',23:'rr',24:'sc',25:'se',26:'sp',27:'to' };
// Todos os tribunais que enviam dados ao DataJud: estaduais, federais, do trabalho, eleitorais, militares e superiores
const UF_TRE: Record<number, string> = { ...UF, 7: 'df' };
const TJM: Record<number, string> = { 13: 'tjmmg', 21: 'tjmrs', 26: 'tjmsp' };
function aliasTribunal(cnj: string): string | null {
  const j = Number(cnj[13]), tr = Number(cnj.slice(14, 16));
  if (j === 8 && UF[tr]) return 'tj' + UF[tr];
  if (j === 4 && tr >= 1 && tr <= 6) return 'trf' + tr;
  if (j === 5 && tr === 0) return 'tst';
  if (j === 5 && tr >= 1 && tr <= 24) return 'trt' + tr;
  if (j === 3) return 'stj';
  if (j === 6 && tr === 0) return 'tse';
  if (j === 6 && UF_TRE[tr]) return 'tre-' + UF_TRE[tr];
  if (j === 7 && tr === 0) return 'stm';
  if (j === 9 && TJM[tr]) return TJM[tr];
  return null;
}
function cnjValido(cnj: string) {
  if (cnj.length !== 20 || digitos(cnj) !== cnj) return false;
  const r = BigInt(cnj.slice(0, 7) + cnj.slice(9) + '00') % 97n;
  return String(98n - r).padStart(2, '0') === cnj.slice(7, 9);
}
const mascara = (d: string) => `${d.slice(0,7)}-${d.slice(7,9)}.${d.slice(9,13)}.${d[13]}.${d.slice(14,16)}.${d.slice(16)}`;
function norm(v: unknown) {
  let r = '';
  for (const ch of String(v ?? '').normalize('NFD').toUpperCase()) {
    const c = ch.charCodeAt(0);
    if (c >= 0x300 && c <= 0x36f) continue;
    r += ((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) ? ch : ' ';
  }
  return r.split(' ').filter(Boolean).join(' ');
}
const LIGA = new Set(['DA', 'DE', 'DO', 'DAS', 'DOS', 'E']);

async function comTempo(url: string, init: RequestInit = {}, ms = 15000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...init, signal: c.signal }); } finally { clearTimeout(t); }
}

async function djen(numero: string): Promise<any[]> {
  const itens: any[] = [];
  for (const formato of [numero, mascara(numero)]) {
    const u = new URL('https://comunicaapi.pje.jus.br/api/v1/comunicacao');
    u.searchParams.set('numeroProcesso', formato);
    u.searchParams.set('itensPorPagina', '100');
    u.searchParams.set('pagina', '1');
    const r = await comTempo(u.toString(), { headers: { Accept: 'application/json' } });
    if (r.status === 429) throw new Error('djen-limite');
    if (!r.ok) throw new Error('djen-' + r.status);
    const j = await r.json();
    const lista = j?.items || j?.itens || j?.data || [];
    if (Array.isArray(lista) && lista.length) { itens.push(...lista); break; }
  }
  return itens;
}
async function djenPorNome(nome: string, oabs: Oab[] = OABS_LANHI): Promise<any[]> {
  const itens: any[] = [];
  const hoje = new Date(); const ini = new Date(Date.now() - 3 * 365 * 864e5);
  const d = (x: Date) => x.toISOString().slice(0, 10);
  let falhas = 0;
  for (const oab of oabs) {
    for (const comData of [true, false]) {
      const u = new URL('https://comunicaapi.pje.jus.br/api/v1/comunicacao');
      u.searchParams.set('nomeParte', nome);
      u.searchParams.set('numeroOab', oab.num);
      u.searchParams.set('ufOab', oab.uf);
      u.searchParams.set('itensPorPagina', '100');
      u.searchParams.set('pagina', '1');
      if (comData) { u.searchParams.set('dataDisponibilizacaoInicio', d(ini)); u.searchParams.set('dataDisponibilizacaoFim', d(hoje)); }
      const r = await comTempo(u.toString(), { headers: { Accept: 'application/json' } }).catch(() => null);
      if (!r || !r.ok) { if (!comData) falhas++; continue; }
      const j = await r.json().catch(() => ({}));
      const lista = j?.items || j?.itens || j?.data || [];
      if (Array.isArray(lista)) itens.push(...lista);
      break;
    }
  }
  if (oabs.length && falhas === oabs.length) throw new Error('djen');
  return itens;
}
const numeroDoItem = (p: any) => digitos(p?.numero_processo || p?.numeroProcesso || p?.numeroprocessocommascara || '');

function temNossaOab(item: any, oabs: Oab[] = OABS_LANHI) { return temOab(item, oabs); }
// Advogados do escritorio: o nome deles aparece em todas as publicacoes com a nossa OAB.
// Por isso o nome de um advogado so confere quando ele e PARTE do processo, nunca pelo texto.
const ADVOGADOS = ['FELIPE SCHENA LANHI', 'DANIELE SCHENA LANHI'];
function nomesAdvogados(item: any): string[] {
  const r = [...ADVOGADOS];
  for (const a of item?.destinatarioadvogados || item?.advogados || []) {
    const n = norm(a?.advogado?.nome ?? a?.nome ?? '');
    if (n.length > 5) r.push(n);
  }
  return r;
}
function nomeConfere(nomeCliente: string, item: any) {
  const alvo = norm(nomeCliente);
  if (alvo.length < 5) return false;
  const partes: string[] = [];
  for (const d of item?.destinatarios || item?.partes || []) partes.push(norm(d?.nome ?? d));
  const advs = nomesAdvogados(item);
  if (advs.some((a) => a === alvo || a.includes(alvo) || alvo.includes(a))) return partes.some((p) => p === alvo);
  let texto = norm(item?.texto);
  for (const a of advs) texto = texto.split(a).join(' ');
  if (partes.some((p) => p === alvo) || (alvo.length > 8 && (partes.some((p) => p.includes(alvo)) || texto.includes(alvo)))) return true;
  const tk = alvo.split(' ').filter((x) => !LIGA.has(x));
  if (tk.length < 2) return false;
  const [pri, ult] = [tk[0], tk[tk.length - 1]];
  return partes.some((p) => { const q = p.split(' ').filter((x) => !LIGA.has(x)); return q[0] === pri && q[q.length - 1] === ult; });
}

function semHtml(v: unknown) {
  let r = '', dentro = false;
  for (const ch of String(v ?? '')) {
    if (ch === '<') { dentro = true; r += ' '; continue; }
    if (ch === '>') { dentro = false; continue; }
    if (!dentro) r += ch;
  }
  return r.split('&nbsp;').join(' ').split('\n').join(' ').split('\r').join(' ').split('\t').join(' ').split(' ').filter(Boolean).join(' ');
}

async function sha1(s: string) {
  const b = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function complementos(m: any) {
  const c = m.complementosTabelados || m.complementos || [];
  if (!Array.isArray(c)) return null;
  const t = c.map((x: any) => [x.nome, x.descricao, x.valor].filter(Boolean).join(': ')).filter(Boolean).join(' · ');
  return t || null;
}
// v13 (24/11/2026): DataJud desligado por decisão do escritório (falhava em todos os processos).
// Religar só com DATAJUD_ATIVO=1 nos segredos da função.
const DATAJUD_ATIVO = Deno.env.get('DATAJUD_ATIVO') === '1';
async function datajud(numero: string): Promise<any[] | null> {
  if (!DATAJUD_ATIVO) return [];
  const alias = aliasTribunal(numero);
  if (!alias) return null;
  const consulta = (chave: string) => comTempo(`https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`, {
    method: 'POST',
    headers: { Authorization: `APIKey ${chave}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ size: 10, query: { match: { numeroProcesso: numero } } }),
  });
  let r: Response | null = null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try { r = await consulta(DATAJUD_KEY); } catch (_) { r = null; }
    if (r && (r.status === 401 || r.status === 403)) {
      if (await renovarChaveDatajud()) { try { r = await consulta(DATAJUD_KEY); } catch (_) { r = null; } }
    }
    if (r && r.ok) break;
    if (r && r.status < 500 && r.status !== 429) break;
    await new Promise((ok) => setTimeout(ok, 1200));
  }
  if (!r || !r.ok) return null;
  const j = await r.json();
  return j?.hits?.hits || [];
}

async function atualizar(adm: any, procId: string, numero: string, pubs: any[] | null) {
  const hits = await datajud(numero).catch(() => null);
  if (pubs === null) { try { pubs = await djen(numero); } catch (_) { pubs = []; } }
  const linhas = new Map<string, any>();
  const capa: Record<string, string | null> = {};
  if (hits && hits.length) {
    const src = (hits.find((h: any) => h._source?.grau === 'G1') || hits[0])._source || {};
    capa.classe = src.classe?.nome || null; capa.orgao_julgador = src.orgaoJulgador?.nome || null; capa.tribunal = src.tribunal || null;
    for (const h of hits) {
      const s = h._source || {}; const grau = s.grau || null;
      for (const m of s.movimentos || []) {
        if (!m?.dataHora || !m?.nome) continue;
        const dt = new Date(m.dataHora); if (isNaN(dt.getTime())) continue;
        const comp = complementos(m);
        const hash = await sha1([grau, m.dataHora, m.codigo, m.nome, comp].join('|'));
        linhas.set(hash, { processo_id: procId, data_hora: dt.toISOString(), codigo: Number.isInteger(m.codigo) ? m.codigo : null,
          nome: String(m.nome).slice(0, 500), complemento: comp ? comp.slice(0, 1000) : null, grau, hash });
      }
    }
  }
  if (pubs && pubs.length) {
    for (const p of pubs) {
      const data = p.data_disponibilizacao || p.dataDisponibilizacao || p.datadisponibilizacao;
      const dt = new Date(data); if (!data || isNaN(dt.getTime())) continue;
      const tipo = p.tipoDocumento || p.tipo_documento || p.tipoComunicacao || 'comunicação';
      const hash = 'djen:' + (p.id ?? p.hash ?? (await sha1(JSON.stringify(p))));
      linhas.set(hash, { processo_id: procId, data_hora: dt.toISOString(), codigo: null,
        nome: ('Publicação oficial: ' + tipo).slice(0, 500), complemento: semHtml(p.texto).slice(0, 1500) || null, grau: null, hash });
      if (!capa.orgao_julgador && (p.nomeOrgao || p.nome_orgao)) capa.orgao_julgador = p.nomeOrgao || p.nome_orgao;
      if (!capa.classe && (p.nomeClasse || p.nome_classe)) capa.classe = p.nomeClasse || p.nome_classe;
      if (!capa.tribunal && (p.siglaTribunal || p.sigla_tribunal)) capa.tribunal = p.siglaTribunal || p.sigla_tribunal;
    }
  }
  let novas = 0, antes = 0; let novasLinhas: any[] = [];
  if (linhas.size) {
    const { data: existentes } = await adm.from('movimentacoes').select('hash').eq('processo_id', procId);
    const ja = new Set((existentes || []).map((x: any) => x.hash));
    antes = ja.size;
    const inserir = [...linhas.values()].filter((l) => !ja.has(l.hash));
    if (inserir.length) {
      const { error } = await adm.from('movimentacoes').insert(inserir);
      if (!error) { novas = inserir.length; novasLinhas = inserir; }
    }
  }
  const upd: Record<string, unknown> = { ultima_sincronizacao: new Date().toISOString(), ...Object.fromEntries(Object.entries(capa).filter(([, v]) => v)) };
  // v11: produto pelo assunto do DataJud, fase calculada e OABs do escritorio que atuam
  const { data: atual } = await adm.from('processos').select('id,cliente_id,apelido,oabs,pericia_em,fase_auto,escritorio_id').eq('id', procId).maybeSingle();
  const oabsEsc = (await oabsDo(adm, atual?.escritorio_id)).map((o) => o.num);
  if (atual && !atual.apelido && hits && hits.length) {
    const ass = hits.flatMap((h: any) => (h._source?.assuntos || []).map((a: any) => a?.nome || '')).join(' | ');
    const prod = produtoDoAssunto(ass); if (prod) upd.apelido = prod;
  }
  const todasNomes: string[] = [...linhas.values()].sort((a, b) => a.data_hora.localeCompare(b.data_hora)).map((l) => l.nome);
  if (todasNomes.length) upd.fase_auto = faseIndice(todasNomes);
  const oabsPub = new Set<string>(atual?.oabs || []);
  for (const p of pubs || []) for (const a of p?.destinatarioadvogados || []) { const n = digitos(String(a?.advogado?.numero_oab ?? a?.numero_oab ?? a?.numeroOab ?? '')); if (oabsEsc.includes(n)) oabsPub.add(n); }
  if (oabsPub.size && oabsPub.size !== (atual?.oabs || []).length) upd.oabs = [...oabsPub];
  if (novas && antes) upd.ultima_novidade = new Date().toISOString();
  upd.fontes = { datajud: !DATAJUD_ATIVO ? 'desligado' : hits === null ? 'fora do ar' : (hits.length ? 'ok' : 'sem dados'), djen: pubs ? pubs.length : 0, em: new Date().toISOString() };
  upd.ultimo_erro = !linhas.size && antes === 0
    ? (hits === null ? 'Fontes públicas fora do ar agora; nova tentativa automática em breve.'
       : 'Ainda não há publicação no DJEN para este processo. Para andamentos e intimações, conecte uma ferramenta de captura em Integrações.')
    : null;
  let { error: erroUpd } = await adm.from('processos').update(upd).eq('id', procId);
  if (erroUpd) { delete upd.fase_auto; delete upd.oabs; ({ error: erroUpd } = await adm.from('processos').update(upd).eq('id', procId)); }
  if (erroUpd) { delete upd.fontes; await adm.from('processos').update(upd).eq('id', procId); }
  if (novasLinhas.length && atual) { try { await regras(adm, { ...atual, oabs: upd.oabs || atual.oabs, fase_nova: upd.fase_auto ?? null }, novasLinhas); } catch (_) { /* tabela tarefas ainda nao criada */ } }
  try { await adm.rpc('recalcular_conclusao', { p_processo: procId }); } catch (_) { /* coluna ainda nao criada */ }
  return novas;
}

// ---------- Consulta processual da equipe (CPF ou numero, em janelas de 2 anos, ate 10 anos) ----------
const JANELAS = 5;              // 5 janelas de 2 anos = 10 anos
const MAX_NUMEROS = 500;        // limite de processos por consulta
const LOTE_RESUMO = 12;         // processos classificados por chamada
const CACHE_HORAS = 24;
function janelaDatas(k: number) {
  const fim = new Date(); fim.setFullYear(fim.getFullYear() - 2 * k);
  const ini = new Date(fim); ini.setFullYear(ini.getFullYear() - 2); ini.setDate(ini.getDate() + 1);
  return { ini, fim };
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);
function enxuto(p: any) {
  // guarda so o que a classificacao usa (publicacoes do DJEN trazem o HTML inteiro)
  return {
    numero_processo: p?.numero_processo || p?.numeroProcesso || null, numeroprocessocommascara: p?.numeroprocessocommascara || null,
    data_disponibilizacao: p?.data_disponibilizacao || p?.dataDisponibilizacao || p?.datadisponibilizacao || null,
    tipoDocumento: p?.tipoDocumento || p?.tipo_documento || null, tipoComunicacao: p?.tipoComunicacao || null,
    texto: String(p?.texto || '').slice(0, 6000), siglaTribunal: p?.siglaTribunal || p?.sigla_tribunal || null,
    nomeClasse: p?.nomeClasse || p?.nome_classe || null, nomeOrgao: p?.nomeOrgao || p?.nome_orgao || null,
    destinatarios: p?.destinatarios || [], destinatarioadvogados: p?.destinatarioadvogados || [],
  };
}
async function djenSemestre(params: Record<string, string>, x: Date, y: Date): Promise<{ itens: any[]; falhou: boolean }> {
  const itens: any[] = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const u = new URL('https://comunicaapi.pje.jus.br/api/v1/comunicacao');
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    u.searchParams.set('dataDisponibilizacaoInicio', ymd(x)); u.searchParams.set('dataDisponibilizacaoFim', ymd(y));
    u.searchParams.set('itensPorPagina', '100'); u.searchParams.set('pagina', String(pagina));
    let r: Response | null = null;
    for (let t = 0; t < 3; t++) {
      r = await comTempo(u.toString(), { headers: { Accept: 'application/json' } }, 30000).catch(() => null);
      if (r && r.status === 429) { await new Promise((ok) => setTimeout(ok, 2000 * (t + 1))); continue; }
      if (!r) { await new Promise((ok) => setTimeout(ok, 1000)); continue; }
      break;
    }
    if (!r || !r.ok) return { itens, falhou: true };
    const j = await r.json().catch(() => ({}));
    const lista = j?.items || j?.itens || j?.data || [];
    if (!Array.isArray(lista) || !lista.length) break;
    for (const p of lista) itens.push(enxuto(p));
    const total = Number(j?.count) || 0;
    if (lista.length < 100 || (total && pagina * 100 >= total)) break;
  }
  return { itens, falhou: false };
}
async function djenBusca(params: Record<string, string>, ini: Date, fim: Date): Promise<{ itens: any[]; falhas: number; partes: number }> {
  // Divide a janela em semestres e consulta 2 de cada vez, para ser rapido sem sobrecarregar a fonte publica
  const pedacos: [Date, Date][] = [];
  let a = new Date(ini);
  while (a <= fim) { const b = new Date(a); b.setMonth(b.getMonth() + 6); b.setDate(b.getDate() - 1); pedacos.push([a, b > fim ? fim : b]); a = new Date(b); a.setDate(a.getDate() + 1); }
  const itens: any[] = []; let falhas = 0;
  for (let i = 0; i < pedacos.length; i += 2) {
    const rs = await Promise.all(pedacos.slice(i, i + 2).map(([x, y]) => djenSemestre(params, x, y)));
    for (const r of rs) { itens.push(...r.itens); if (r.falhou) falhas++; }
  }
  return { itens, falhas, partes: pedacos.length };
}
function mascaraCpf(c: string) { return '***.' + c.slice(3, 6) + '.' + c.slice(6, 9) + '-**'; }
const RES: [RegExp, string][] = [
  [/IMPROCED/, 'indeferido'],
  [/PROCEDENCIA EM PARTE|PROCEDENTE EM PARTE|PARCIALMENTE PROCEDENTE|PARCIAL PROCEDENCIA/, 'parcial'],
  [/HOMOLOGACAO DE (TRANSACAO|ACORDO)|HOMOLOGO (O |A )?(ACORDO|TRANSACAO)|ACORDO HOMOLOGADO/, 'acordo'],
  [/PROCEDENCIA|JULGO PROCEDENTE|PEDIDO PROCEDENTE/, 'deferido'],
  [/EXTINCAO .*SEM RESOLUCAO|SEM RESOLUCAO DE MERITO|INDEFERIMENTO DA (PETICAO )?INICIAL|DESISTENCIA/, 'extinto'],
];
function resultadoDe(t: string): string | null { const n = norm(t); for (const [re, r] of RES) if (re.test(n)) return r; return null; }
function classificar(numero: string, hits: any[] | null, pubs: any[]) {
  const movs: { d: number; nome: string; comp: string; cod: number | null }[] = [];
  let src: any = {};
  if (hits && hits.length) {
    src = (hits.find((h: any) => h._source?.grau === 'G1') || hits[0])._source || {};
    for (const h of hits) for (const m of h._source?.movimentos || []) {
      const d = new Date(m?.dataHora).getTime(); if (!m?.nome || isNaN(d)) continue;
      movs.push({ d, nome: String(m.nome), comp: complementos(m) || '', cod: Number.isInteger(m.codigo) ? m.codigo : null });
    }
  }
  for (const p of pubs) {
    const d = new Date(p.data_disponibilizacao || p.dataDisponibilizacao || p.datadisponibilizacao).getTime(); if (isNaN(d)) continue;
    movs.push({ d, nome: 'Publicação oficial: ' + (p.tipoDocumento || p.tipo_documento || p.tipoComunicacao || 'comunicação'), comp: semHtml(p.texto).slice(0, 4000), cod: null });
  }
  movs.sort((a, b) => a.d - b.d);
  let situacao = 'ativo', concluido_em: string | null = null, resultado: string | null = null, resultado_em: string | null = null, resultado_txt: string | null = null;
  for (const m of movs) {
    const t = norm(m.nome + ' ' + (m.nome.startsWith('Publica') ? '' : m.comp));
    if (m.cod === 893 || /DESARQUIV/.test(t)) { situacao = 'ativo'; concluido_em = null; }
    else if (!m.nome.startsWith('Publica') && (m.cod === 22 || m.cod === 246 || /BAIXA DEFINITIVA|ARQUIVAMENTO DEFINITIVO|ARQUIVADO DEFINITIVAMENTE/.test(t))) { situacao = 'concluido'; concluido_em = new Date(m.d).toISOString(); }
    const alvo = m.nome.startsWith('Publica') ? m.comp.slice(0, 4000) : m.nome + ' ' + m.comp;
    const r = resultadoDe(alvo);
    if (r) { resultado = r; resultado_em = new Date(m.d).toISOString(); resultado_txt = (m.nome.startsWith('Publica') ? m.nome : m.nome + (m.comp ? ' (' + m.comp + ')' : '')).slice(0, 300); }
  }
  const ult = movs[movs.length - 1];
  const partes = new Set<string>();
  for (const p of pubs) for (const d of p?.destinatarios || []) { const n = String(d?.nome ?? d ?? '').trim(); if (n && !/INSTITUTO NACIONAL DO SEGURO SOCIAL|^INSS$/i.test(n)) partes.add(n); }
  const p0 = pubs[0] || {};
  return {
    numero_cnj: numero,
    tribunal: src.tribunal || p0.siglaTribunal || p0.sigla_tribunal || null,
    classe: src.classe?.nome || p0.nomeClasse || p0.nome_classe || null,
    assunto: (src.assuntos || []).map((a: any) => a?.nome).filter(Boolean)[0] || null,
    orgao: src.orgaoJulgador?.nome || p0.nomeOrgao || p0.nome_orgao || null,
    ajuizado_em: src.dataAjuizamento ? new Date(src.dataAjuizamento).toISOString() : null,
    situacao, concluido_em, resultado, resultado_em, resultado_txt,
    ultima_mov: ult ? (ult.nome.startsWith('Publica') ? ult.nome : ult.nome).slice(0, 300) : null,
    ultima_data: ult ? new Date(ult.d).toISOString() : null,
    partes: [...partes].slice(0, 3).join(', ') || null,
    fontes: [hits === null ? (DATAJUD_ATIVO ? 'DataJud fora do ar' : null) : hits.length ? 'DataJud' : null, pubs.length ? 'DJEN' : null].filter(Boolean).join(' + ') || 'sem dados',
    atualizado_em: new Date().toISOString(),
  };
}

async function equipeConsulta(adm: any, eu: any, body: any) {
  const v = digitos(body?.valor);
  const k = Math.min(JANELAS - 1, Math.max(0, Number(body?.janela) || 0));
  const { ini, fim } = janelaDatas(k);
  const desde = new Date(Date.now() - 36e5).toISOString();
  const { count } = await adm.from('consultas_equipe').select('id', { count: 'exact', head: true }).eq('email', eu.email).gte('em', desde);
  if ((count || 0) >= 60) return { ok: false, motivo: 'limite' };
  const numeros = new Map<string, any[]>();
  const add = (n: string, p: any | null) => { if (!cnjValido(n)) return; if (!numeros.has(n)) numeros.set(n, []); if (p) numeros.get(n)!.push(p); };
  let tipo = '', alvo = '', aviso: string | null = null, falhasFonte = 0;
  const diag: Record<string, number> = {};
  const esc = eu.escritorio_id || LANHI; const oabs = await oabsDo(adm, esc);

  if (v.length === 20) {
    if (!cnjValido(v)) return { ok: false, motivo: 'formato' };
    tipo = 'numero'; alvo = mascara(v);
    const { data: nosso } = await adm.from('processos').select('id').eq('numero_cnj', v).eq('escritorio_id', esc).limit(1);
    let pubs: any[] = [];
    try { pubs = await djen(v); } catch (_) { falhasFonte++; }
    const doEscritorio = (nosso && nosso.length) || pubs.some((p) => temOab(p, oabs));
    const meu = eu.nome_completo && pubs.some((p) => nomeConfere(eu.nome_completo, p));
    if (!doEscritorio && !meu) return { ok: false, motivo: falhasFonte ? 'indisponivel' : 'fora' };
    add(v, null); for (const p of pubs) numeros.get(v)!.push(p);
  } else if (v.length === 11) {
    let ehProprio = !!(eu.cpf && v === eu.cpf);
    if (!ehProprio && eu.nome_completo) {
      const { data: c2 } = await adm.from('clientes').select('nome').eq('cpf', v).eq('escritorio_id', esc).maybeSingle();
      if (c2 && norm(c2.nome) === norm(eu.nome_completo)) ehProprio = true;
    }
    if (ehProprio) {
      tipo = 'proprio'; alvo = mascaraCpf(v);
      const minhaOab = lerOab(eu.oab);
      if (minhaOab) {
        const r = await djenBusca({ numeroOab: minhaOab.num, ufOab: minhaOab.uf }, ini, fim); falhasFonte += r.falhas;
        for (const p of r.itens) add(numeroDoItem(p), p);
        diag.oab = r.itens.length; diag.semestres = r.partes; diag.falhasOab = r.falhas;
      }
      if (eu.nome_completo) {
        const r = await djenBusca({ nomeParte: eu.nome_completo }, ini, fim); falhasFonte += r.falhas;
        for (const p of r.itens) { const ps = (p?.destinatarios || []).map((d: any) => norm(d?.nome ?? d)); if (ps.includes(norm(eu.nome_completo))) add(numeroDoItem(p), p); }
        if (!eu.oab) aviso = 'Busca pelo nome completo: pode incluir processos de pessoas com o mesmo nome.';
      }
    } else {
      const { data: cli } = await adm.from('clientes').select('id,nome').eq('cpf', v).eq('escritorio_id', esc).maybeSingle();
      if (!cli) return { ok: false, motivo: eu.cpf ? 'fora' : 'fora_sem_cpf' };
      tipo = 'cliente'; alvo = (cli.nome || 'Cliente') + ' · ' + mascaraCpf(v);
      for (const oab of oabs) {
        const r = await djenBusca({ nomeParte: cli.nome, numeroOab: oab.num, ufOab: oab.uf }, ini, fim); falhasFonte += r.falhas;
        for (const p of r.itens) if (temOab(p, oabs) && nomeConfere(cli.nome, p)) add(numeroDoItem(p), p);
      }
      if (k === 0) { const { data: cad } = await adm.from('processos').select('numero_cnj').eq('cliente_id', cli.id); for (const p of cad || []) add(p.numero_cnj, null); }
    }
  } else return { ok: false, motivo: 'formato' };

  const lista = [...numeros.keys()].slice(0, MAX_NUMEROS);
  if (numeros.size > MAX_NUMEROS) aviso = (aviso ? aviso + ' ' : '') + 'Foram encontrados mais de ' + MAX_NUMEROS + ' processos neste período; mostrando os ' + MAX_NUMEROS + ' primeiros.';
  if (falhasFonte && !lista.length) return { ok: false, motivo: 'indisponivel' };
  if (falhasFonte) aviso = (aviso ? aviso + ' ' : '') + (diag.falhasOab ? 'A busca pela OAB não respondeu em ' + diag.falhasOab + ' de ' + diag.semestres + ' semestres; consulte de novo daqui a pouco para completar.' : 'Parte das publicações não respondeu agora; consulte de novo mais tarde para completar.');
  // guarda as publicacoes encontradas para a classificacao (so o necessario, por 24h)
  const { data: reg } = await adm.from('consultas_equipe').insert({ email: eu.email, tipo, alvo, janela: k, numeros: lista, total: lista.length }).select('id').single();
  await adm.from('auditoria').insert({ quem: eu.email, tipo: 'equipe', acao: 'consulta processual (' + tipo + ', ' + (2 * k) + ' a ' + (2 * k + 2) + ' anos)', alvo }).then(() => null, () => null);
  pubsTemp.set(reg?.id, { em: Date.now(), mapa: numeros });
  return { ok: true, id: reg?.id, tipo, alvo, janela: k, de: ymd(ini), ate: ymd(fim), total: lista.length, aviso, temCpf: !!eu.cpf, diag };
}
const pubsTemp = new Map<number, { em: number; mapa: Map<string, any[]> }>();


// ---------- CPFs da lista Clientes do ClickUp (uma pagina de 100 por chamada; precisa do segredo CLICKUP_TOKEN) ----------
const CK_LISTA = '901713910554', CK_CPF = '0dc10bac-a4cf-4a72-bb74-22caa8ce9db2', CK_NOME = '38f6cb51-0b54-414a-bcab-a49935de54fc', CK_ESCR = '395a9cfc-a59e-4178-a757-045465483c2d';
const CK_DEBASTIANI = ['de61a352-1d90-4629-a8be-534328f2ff10', 1, '1'];
function cpfValido(c: string) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  for (const t of [9, 10]) { let s2 = 0; for (let i = 0; i < t; i++) s2 += Number(c[i]) * (t + 1 - i); const d = (s2 * 10) % 11 % 10; if (d !== Number(c[t])) return false; }
  return true;
}
async function importarClickup(adm: any, eu: any, body: any) {
  if (!eu.admin) return { ok: false, motivo: 'sessao' };
  return await clickupPagina(adm, Math.max(0, Number(body?.pagina) || 0));
}
async function clickupPagina(adm: any, pagina: number) {
  const tok = Deno.env.get('CLICKUP_TOKEN');
  if (!tok) return { ok: false, motivo: 'sem_token' };
  const u = 'https://api.clickup.com/api/v2/list/' + CK_LISTA + '/task?include_closed=true&subtasks=true&page=' + pagina;
  const r = await comTempo(u, { headers: { Authorization: tok } }, 30000).catch(() => null);
  if (!r || !r.ok) return { ok: false, motivo: r && (r.status === 401 || r.status === 403) ? 'token' : 'indisponivel' };
  const j: any = await r.json().catch(() => ({}));
  const tarefas = j?.tasks || [];
  const linhas = new Map<string, any>(); let lidos = 0, semCpf = 0, invalidos = 0, outroEscritorio = 0;
  for (const t of tarefas) {
    lidos++;
    const f = (id: string) => (t.custom_fields || []).find((c: any) => c.id === id);
    const escr = f(CK_ESCR)?.value;
    if (escr !== undefined && escr !== null && CK_DEBASTIANI.includes(escr)) { outroEscritorio++; continue; }
    const cpf = digitos(String(f(CK_CPF)?.value ?? ''));
    if (!cpf) { semCpf++; continue; }
    if (!cpfValido(cpf)) { invalidos++; continue; }
    const nome = String(f(CK_NOME)?.value || t.name || '').replace(/\s+/g, ' ').trim();
    const nn = norm(nome); if (nn.length < 5) continue;
    linhas.set(nn, { escritorio_id: LANHI, nome_norm: nn, nome, cpf });
  }
  if (linhas.size) {
    const { error } = await adm.from('importacao_cpfs').upsert([...linhas.values()], { onConflict: 'escritorio_id,nome_norm' });
    if (error) return { ok: false, motivo: 'indisponivel', detalhe: error.message };
  }
  return { ok: true, pagina, lidos, validos: linhas.size, sem_cpf: semCpf, invalidos, outro_escritorio: outroEscritorio, fim: !!j?.last_page || tarefas.length < 100 };
}

// ---------- Importacao de clientes (v10): levantamento a partir das publicacoes das OABs do escritorio ----------
// Nao grava nada em clientes/processos: so preenche a previa (importacao_itens) para o gestor revisar.
const IMPORT_DESDE = '2023-01-01';
const ORGAO_PUBLICO = /INSTITUTO NACIONAL DO SEGURO SOCIAL|^INSS$|^UNIAO|UNIAO FEDERAL|FAZENDA NACIONAL|MUNICIPIO D|^ESTADO D|MINISTERIO PUBLICO|DEFENSORIA|PROCURADORIA|^SIGILO|SEGREDO DE JUSTICA|^JUIZO|^CAIXA ECONOMICA FEDERAL$/;
function semestresImport(): [Date, Date][] {
  const out: [Date, Date][] = []; let a = new Date(IMPORT_DESDE + 'T00:00:00Z'); const hoje = new Date();
  while (a <= hoje) { const b = new Date(a); b.setUTCMonth(b.getUTCMonth() + 6); b.setUTCDate(b.getUTCDate() - 1); out.push([a, b > hoje ? hoje : b]); a = new Date(b); a.setUTCDate(a.getUTCDate() + 1); }
  return out;
}
const nomeLimpo = (t: string) => String(t || '').replace(/\s+/g, ' ').trim();
async function importarLevantamento(adm: any, eu: any, body: any) {
  if (!eu.admin) return { ok: false, motivo: 'sessao' };
  const esc = eu.escritorio_id || LANHI;
  const oab = (await oabsDo(adm, esc)).find((o) => o.num === digitos(body?.oab)); if (!oab) return { ok: false, motivo: 'formato' };
  const sems = semestresImport(); const k = Number(body?.semestre) || 0;
  if (k < 0 || k >= sems.length) return { ok: true, fim: true, semestres: sems.length };
  const [x, y] = sems[k];
  const res: any = await levantarPeriodo(adm, oab, x, y, esc);
  if (!res.ok) return res;
  return { ok: true, semestre: k, semestres: sems.length, de: ymd(x), ate: ymd(y), publicacoes: res.publicacoes, processos: res.processos, falhou: res.falhou, cruzar: res.cruzar };
}

async function levantarPeriodo(adm: any, oabIn: Oab | string, x: Date, y: Date, esc: string = LANHI) {
  const o: Oab = typeof oabIn === 'string' ? { num: oabIn, uf: 'SC' } : oabIn; const oab = o.num;
  const r = await djenSemestre({ numeroOab: o.num, ufOab: o.uf }, x, y);
  // agrupa por processo
  const grupos = new Map<string, { pubs: any[] }>();
  for (const p of r.itens) { const n = numeroDoItem(p); if (!cnjValido(n)) continue; if (!grupos.has(n)) grupos.set(n, { pubs: [] }); grupos.get(n)!.pubs.push(p); }
  const numeros = [...grupos.keys()];
  const existentes = new Map<string, any>();
  for (let i = 0; i < numeros.length; i += 200) {
    const { data } = await adm.from('importacao_itens').select('*').eq('escritorio_id', esc).in('numero_cnj', numeros.slice(i, i + 200));
    for (const e of data || []) existentes.set(e.numero_cnj, e);
  }
  const linhas: any[] = [];
  for (const [n, g] of grupos) {
    const ant = existentes.get(n);
    const cont: Record<string, { nome: string; c: number; polo: string | null }> = {};
    for (const [kn, v] of Object.entries(ant?.partes_cont || {})) cont[kn] = v as any;
    let ini = ant?.primeira_pub || null, fim = ant?.ultima_pub || null;
    for (const p of g.pubs) {
      const d = String(p.data_disponibilizacao || '').slice(0, 10);
      if (d) { if (!ini || d < ini) ini = d; if (!fim || d > fim) fim = d; }
      const vistos = new Set<string>();
      for (const de of p.destinatarios || []) {
        const nome = nomeLimpo(de?.nome ?? de); const kn = norm(nome);
        if (!kn || kn.length < 5 || ORGAO_PUBLICO.test(kn) || vistos.has(kn)) continue;
        vistos.add(kn);
        cont[kn] = { nome: (cont[kn]?.nome || nome), c: (cont[kn]?.c || 0) + 1, polo: de?.polo || cont[kn]?.polo || null };
      }
    }
    const rank = Object.entries(cont).sort((a, b) => b[1].c - a[1].c);
    const p0 = g.pubs[g.pubs.length - 1] || {};
    let nome: string | null = null, polo: string | null = null, alerta: string | null = null, outras: string | null = null;
    if (!rank.length) alerta = 'Sem parte identificada (processo sigiloso ou sem nome na publicação)';
    else {
      nome = rank[0][1].nome; polo = rank[0][1].polo;
      outras = rank.slice(1, 4).map((x) => x[1].nome).join(', ') || null;
      if (rank.length > 1 && rank[1][1].c === rank[0][1].c) alerta = 'Mais de uma parte intimada: confira qual é o cliente';
      else if (polo === 'P') alerta = 'Cliente no polo passivo (escritório na defesa): confira';
    }
    // nome corrigido a mao pelo gestor (nao bate com nenhuma parte das publicacoes): mantem a correcao
    const corrigido = ant && ant.nome_norm && !cont[ant.nome_norm] && !ant.alerta;
    if (corrigido) { nome = ant.nome; alerta = null; }
    const oabs = new Set<string>(ant?.oabs || []); oabs.add(oab);
    linhas.push({
      escritorio_id: esc, numero_cnj: n, nome, nome_norm: nome ? norm(nome) : null, polo, outras_partes: outras, partes_cont: cont,
      oabs: [...oabs], tribunal: p0.siglaTribunal || ant?.tribunal || null, orgao: p0.nomeOrgao || ant?.orgao || null, classe: p0.nomeClasse || ant?.classe || null,
      primeira_pub: ini, ultima_pub: fim,
      alerta,
      atualizado_em: new Date().toISOString(),
    });
  }
  for (let i = 0; i < linhas.length; i += 200) {
    const { error } = await adm.from('importacao_itens').upsert(linhas.slice(i, i + 200), { onConflict: 'escritorio_id,numero_cnj' });
    if (error) return { ok: false, motivo: 'indisponivel', detalhe: error.message };
  }
  const cruz = await adm.rpc('importacao_cruzar');
  return { ok: true, publicacoes: r.itens.length, processos: numeros.length, falhou: r.falhou, cruzar: cruz.data || null, numeros };
}


async function equipeConsultaResumo(adm: any, eu: any, body: any) {
  const id = Number(body?.id); const de = Math.max(0, Number(body?.de) || 0);
  const { data: reg } = await adm.from('consultas_equipe').select('id,email,numeros,em').eq('id', id).maybeSingle();
  if (!reg || reg.email !== eu.email || Date.now() - new Date(reg.em).getTime() > 6 * 36e5) return { ok: false, motivo: 'expirou' };
  const fatia = (reg.numeros || []).slice(de, de + LOTE_RESUMO);
  const { data: cache } = await adm.from('processos_consulta').select('*').in('numero_cnj', fatia.length ? fatia : ['-']);
  const prontos = new Map((cache || []).filter((c: any) => Date.now() - new Date(c.atualizado_em).getTime() < CACHE_HORAS * 36e5).map((c: any) => [c.numero_cnj, c]));
  const mem = pubsTemp.get(id)?.mapa;
  const inicio = Date.now(); const itens: any[] = []; let feitos = 0;
  for (const n of fatia) {
    if (prontos.has(n)) { itens.push(prontos.get(n)); feitos++; continue; }
    if (Date.now() - inicio > 35000) break;
    const hits = await datajud(n).catch(() => null);
    let pubs = mem?.get(n) || [];
    if (!pubs.length) { try { pubs = await djen(n); } catch (_) { pubs = []; } }
    const r = classificar(n, hits, pubs);
    await adm.from('processos_consulta').upsert(r, { onConflict: 'numero_cnj' }).then(() => null, () => null);
    itens.push(r); feitos++;
  }
  // marca os que ja sao processos cadastrados do escritorio
  const { data: nossos } = await adm.from('processos').select('numero_cnj').in('numero_cnj', itens.length ? itens.map((x) => x.numero_cnj) : ['-']);
  const cad = new Set((nossos || []).map((x: any) => x.numero_cnj));
  for (const x of itens) x.cadastrado = cad.has(x.numero_cnj);
  const prox = de + feitos;
  return { ok: true, itens, proximo: prox < (reg.numeros || []).length ? prox : null, total: (reg.numeros || []).length };
}

// ---------- Senha da equipe ----------
// Mesma regra do banco e do app: sem espacos nas pontas e acentos unificados
const normSenha = (v: unknown) => String(v ?? '').normalize('NFC').trim();

async function liberarConta(adm: any, st: any, email: string, senha: string) {
  if (st.user_id) {
    const up = await adm.auth.admin.updateUserById(st.user_id, { password: senha, email_confirm: true });
    if (up.error) return { ok: false, motivo: 'indisponivel', detalhe: up.error.message };
  } else {
    const cr = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (cr.error) return { ok: false, motivo: 'indisponivel', detalhe: cr.error.message };
  }
  return { ok: true };
}

// Primeiro acesso ou esqueci a senha: e-mail + senha mestra + nova senha pessoal
async function equipeNovaSenha(adm: any, emailIn: string, mestra: string, nova: string) {
  const email = String(emailIn || '').trim().toLowerCase();
  if (!email || !mestra || !nova) return { ok: false, motivo: 'mestra' };
  const r = await adm.rpc('redefinir_senha_pessoal', { p_email: email, p_mestra: normSenha(mestra), p_nova: normSenha(nova) });
  if (r.error) return { ok: false, motivo: 'indisponivel', detalhe: r.error.message };
  const st: any = r.data;
  if (!st || !st.ok) return { ok: false, motivo: (st && st.motivo) || 'mestra', erro: st && st.erro, restam: st && st.restam };
  return await liberarConta(adm, st, email, normSenha(nova));
}

async function equipeEntrar(adm: any, emailIn: string, senhaIn: string) {
  const email = String(emailIn || '').trim().toLowerCase();
  const senha = normSenha(senhaIn);
  if (!email || !senha) return { ok: false, motivo: 'senha' };
  let r = await adm.rpc('conferir_login_equipe', { p_email: email, p_senha: senha });
  if (r.error && String(r.error.message || '').indexOf('conferir_login_equipe') >= 0) {
    r = await adm.rpc('conferir_senha_equipe', { p_email: email, p_senha: senha });   // banco ainda na versao anterior
  }
  if (r.error) return { ok: false, motivo: 'indisponivel', detalhe: r.error.message };
  const st: any = r.data;
  if (!st || !st.ok) return { ok: false, motivo: (st && st.motivo) || 'senha', restam: st && st.restam };
  if (st.user_id) {
    const up = await adm.auth.admin.updateUserById(st.user_id, { password: senha, email_confirm: true });
    if (up.error) return { ok: false, motivo: 'indisponivel', detalhe: up.error.message };
  } else {
    const cr = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (cr.error) return { ok: false, motivo: 'indisponivel', detalhe: cr.error.message };
  }
  return { ok: true };
}

// ---------- Entrada de emergencia com codigo de recuperacao (administradores) ----------
async function equipeRecuperar(adm: any, emailIn: string, codigo: string) {
  const email = String(emailIn || '').trim().toLowerCase();
  if (!email || !codigo) return { ok: false, motivo: 'codigo' };
  const r = await adm.rpc('conferir_codigo_recuperacao', { p_email: email, p_codigo: codigo });
  if (r.error) return { ok: false, motivo: 'indisponivel' };
  const st: any = r.data;
  if (!st || !st.ok) return { ok: false, motivo: (st && st.motivo) || 'codigo' };
  const temp = bytesParaB64u(crypto.getRandomValues(new Uint8Array(24)));
  if (st.user_id) {
    const up = await adm.auth.admin.updateUserById(st.user_id, { password: temp, email_confirm: true });
    if (up.error) return { ok: false, motivo: 'indisponivel' };
  } else {
    const cr = await adm.auth.admin.createUser({ email, password: temp, email_confirm: true });
    if (cr.error) return { ok: false, motivo: 'indisponivel' };
  }
  return { ok: true, temporaria: temp, restantes: st.restantes };
}

// ---------- Digital ou rosto (WebAuthn) ----------
const ORIGENS = ['https://www.lanhiadvogados.com.br', 'https://lanhiadvogados.com.br', 'https://comerciallanhiadv-ship-it.github.io'];

function b64uParaBytes(t: string) {
  let b = String(t || '').split('-').join('+').split('_').join('/');
  while (b.length % 4) b += '=';
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesParaB64u(a: Uint8Array) {
  let bin = '';
  for (let i = 0; i < a.length; i++) bin += String.fromCharCode(a[i]);
  return btoa(bin).split('+').join('-').split('/').join('_').split('=').join('');
}
function iguais(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
function derParaBruto(der: Uint8Array) {
  // ECDSA DER (0x30 len 0x02 lenR R 0x02 lenS S) para r||s de 32 bytes cada
  let i = 2;
  if (der[1] & 0x80) i = 2 + (der[1] & 0x7f);
  const pega = () => {
    if (der[i] !== 0x02) throw new Error('assinatura');
    const len = der[i + 1];
    let v = der.slice(i + 2, i + 2 + len);
    i = i + 2 + len;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    const o = new Uint8Array(32);
    o.set(v, 32 - v.length);
    return o;
  };
  const r = pega(), s2 = pega();
  const out = new Uint8Array(64);
  out.set(r, 0); out.set(s2, 32);
  return out;
}
function sessaoDoToken(tok: string) {
  try {
    const parte = tok.split('.')[1];
    const j = JSON.parse(new TextDecoder().decode(b64uParaBytes(parte)));
    return String(j.session_id || '');
  } catch (_) { return ''; }
}
async function novoDesafio(adm: any, userId: string) {
  const a = crypto.getRandomValues(new Uint8Array(32));
  const desafio = bytesParaB64u(a);
  await adm.from('webauthn_desafios').upsert({ user_id: userId, desafio, expira: new Date(Date.now() + 120000).toISOString() });
  const { data: lista } = await adm.from('dispositivos').select('credencial').eq('user_id', userId);
  return { ok: true, desafio, credenciais: (lista || []).map((x: any) => x.credencial) };
}
async function conferirDigital(adm: any, userId: string, sessao: string, b: any) {
  if (!sessao) return { ok: false, motivo: 'sessao' };
  const { data: d } = await adm.from('webauthn_desafios').select('desafio,expira').eq('user_id', userId).maybeSingle();
  await adm.from('webauthn_desafios').delete().eq('user_id', userId);
  if (!d || new Date(d.expira).getTime() < Date.now()) return { ok: false, motivo: 'expirado' };
  const { data: disp } = await adm.from('dispositivos').select('id,chave,alg,contador').eq('user_id', userId).eq('credencial', String(b.credencial || '')).maybeSingle();
  if (!disp) return { ok: false, motivo: 'aparelho' };
  const clientBytes = b64uParaBytes(b.clientData);
  const cd = JSON.parse(new TextDecoder().decode(clientBytes));
  if (cd.type !== 'webauthn.get' || cd.challenge !== d.desafio) return { ok: false, motivo: 'desafio' };
  if (ORIGENS.indexOf(String(cd.origin)) < 0) return { ok: false, motivo: 'origem' };
  const host = new URL(String(cd.origin)).hostname;
  const auth = b64uParaBytes(b.authData);
  if (auth.length < 37) return { ok: false, motivo: 'dados' };
  const rpHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(host)));
  if (!iguais(auth.slice(0, 32), rpHash)) return { ok: false, motivo: 'origem' };
  const flags = auth[32];
  if ((flags & 0x01) === 0 || (flags & 0x04) === 0) return { ok: false, motivo: 'verificacao' };
  const contador = ((auth[33] << 24) >>> 0) + (auth[34] << 16) + (auth[35] << 8) + auth[36];
  const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientBytes));
  const dados = new Uint8Array(auth.length + clientHash.length);
  dados.set(auth, 0); dados.set(clientHash, auth.length);
  const spki = b64uParaBytes(disp.chave);
  const assinatura = b64uParaBytes(b.assinatura);
  let valido = false;
  if (disp.alg === -7) {
    const chave = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    valido = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, chave, derParaBruto(assinatura), dados);
  } else if (disp.alg === -257) {
    const chave = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    valido = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', chave, assinatura, dados);
  }
  if (!valido) return { ok: false, motivo: 'assinatura' };
  if (contador > 0 && Number(disp.contador) > 0 && contador <= Number(disp.contador)) return { ok: false, motivo: 'aparelho' };
  await adm.from('dispositivos').update({ contador, usado_em: new Date().toISOString() }).eq('id', disp.id);
  const lib = await adm.rpc('liberar_sessao_dispositivo', { p_user: userId, p_session: sessao });
  if (lib.error) return { ok: false, motivo: 'indisponivel' };
  return { ok: true };
}

// Atualizacao automatica (v6): chamada pelo agendamento do banco (pg_cron), sem usuario logado.
// Confere a chave guardada no proprio banco e atualiza os processos mais antigos, dentro de ~50 segundos.
async function agendada(adm: any, chave: string) {
  const { data: cfg } = await adm.from('agenda_chave').select('chave').eq('id', 1).maybeSingle();
  const certa = String(cfg?.chave || '');
  const a = new TextEncoder().encode(chave), b = new TextEncoder().encode(certa);
  if (!certa || a.length !== b.length || !iguais(a, b)) return { ok: false, motivo: 'chave' };
  const inicio = Date.now();
  const filtro = 'ultima_sincronizacao.is.null,ultima_sincronizacao.lt.' + new Date(Date.now() - ATUALIZA_HORAS * 36e5).toISOString();
  // Em andamento: a cada 6 horas. Concluidos: uma vez por semana (para perceber desarquivamento).
  const { data: l1 } = await adm.from('processos').select('id,numero_cnj').eq('ativo', true).eq('concluido', false).or(filtro)
    .order('ultima_sincronizacao', { ascending: true, nullsFirst: true }).limit(20);
  let lista: any[] = l1 || [];
  if (lista.length < 20) {
    const { data: l2 } = await adm.from('processos').select('id,numero_cnj').eq('ativo', true).eq('concluido', true)
      .lt('ultima_sincronizacao', new Date(Date.now() - 7 * 864e5).toISOString())
      .order('ultima_sincronizacao', { ascending: true }).limit(20 - lista.length);
    lista = lista.concat(l2 || []);
  }
  let novas = 0, feitos = 0, falhas = 0;
  // v11: antes das atualizacoes, a nutricao automatica (DJEN das OABs, ClickUp e rotinas do dia)
  const auto = await nutricaoAutomatica(adm, inicio).catch((e) => ({ erro: String(e).slice(0, 200) }));
  // atualiza 4 processos por vez para dar conta de centenas de processos por dia
  const fila = [...(lista || [])];
  const trabalhador = async () => {
    while (fila.length && Date.now() - inicio < 52000) {
      const p = fila.shift(); if (!p) break;
      try { novas += await atualizar(adm, p.id, p.numero_cnj, null); feitos++; } catch (_) { falhas++; }
    }
  };
  await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()]);
  const { count: restantes } = await adm.from('processos').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('concluido', false).or(filtro);
  await adm.from('agenda_execucoes').insert({ atualizados: feitos, novas, restantes: restantes || 0, falhas });
  await adm.from('agenda_execucoes').delete().lt('em', new Date(Date.now() - 30 * 864e5).toISOString());
  return { ok: true, atualizados: feitos, novas, restantes: restantes || 0, falhas, auto };
}

// ---------- v11: nutricao automatica e interpretacao das movimentacoes ----------
const OABS_ESC = ['30297', '37550'];
async function estado(adm: any, chave: string) { const { data } = await adm.from('automacao_estado').select('valor').eq('chave', chave).maybeSingle(); return data?.valor ?? null; }
async function guardar(adm: any, chave: string, valor: string, esc: string = LANHI) { await adm.from('automacao_estado').upsert({ chave, valor, em: new Date().toISOString(), escritorio_id: esc }, { onConflict: 'chave' }); }
function hojeBR() { return new Date(Date.now() - 3 * 36e5).toISOString().slice(0, 10); }

async function nutricaoAutomatica(adm: any, inicio: number) {
  const out: Record<string, unknown> = {};
  const hoje = hojeBR();
  // 1) DJEN das duas OABs, uma vez por dia: processos novos entram sozinhos; os ja cadastrados vao para o inicio da fila
  const djenOut: Record<string, unknown>[] = [];
  for (const [esc, lista] of await oabsPorEscritorio(adm)) {
    const suf = esc === LANHI ? '' : ':' + esc;
    if ((await estado(adm, 'djen_diario' + suf)) === hoje || !lista.length || Date.now() - inicio > 40000) continue;
    const ultimo = (await estado(adm, 'djen_ate' + suf)) || new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
    const x = new Date(ultimo + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() - 1);
    const y = new Date(hoje + 'T00:00:00Z');
    let novosNum: string[] = []; let ok = true;
    for (const oab of lista) {
      const r: any = await levantarPeriodo(adm, oab, x, y, esc);
      if (!r.ok || r.falhou) ok = false;
      novosNum = novosNum.concat(r.numeros || []);
    }
    const ap = await adm.rpc('importacao_aplicar', { p_incluir_alertas: false, p_lote: 300 });
    if (novosNum.length) await adm.from('processos').update({ ultima_sincronizacao: null }).eq('escritorio_id', esc).in('numero_cnj', [...new Set(novosNum)].slice(0, 500));
    if (ok) { await guardar(adm, 'djen_diario' + suf, hoje, esc); await guardar(adm, 'djen_ate' + suf, hoje, esc); }
    djenOut.push({ escritorio: esc, processos: novosNum.length, aplicados: ap.data?.aplicados ?? null, ok });
  }
  if (djenOut.length) out.djen = djenOut.length === 1 ? djenOut[0] : djenOut;
  // 2) ClickUp: uma pagina por rodada ate o fim da lista; recomeca no dia seguinte
  if (Date.now() - inicio < 25000 && Deno.env.get('CLICKUP_TOKEN')) {
    const dia = await estado(adm, 'clickup_dia'); let pag = Number(await estado(adm, 'clickup_pagina')) || 0;
    if (dia !== hoje || pag >= 0) {
      if (dia !== hoje && pag < 0) pag = 0;
      if (pag >= 0) {
        const r: any = await clickupPagina(adm, pag);
        if (r.ok) { await guardar(adm, 'clickup_pagina', String(r.fim ? -1 : pag + 1)); if (r.fim) await adm.rpc('importacao_cruzar'); }
        await guardar(adm, 'clickup_dia', hoje);
        out.clickup = { pagina: pag, ok: r.ok, fim: r.fim };
      }
    }
  }
  // 3) rotinas do dia no banco: contas recorrentes, contas vencendo, CPFs pendentes, OABs e revisao
  const d = await adm.rpc('automacoes_diarias', { p_forcar: false });
  out.diaria = d.data || (d.error ? d.error.message : null);
  return out;
}

function produtoDoAssunto(t: string): string | null {
  const n = norm(t);
  const M: [RegExp, string][] = [
    [/AUXILIO.?ACIDENTE/, 'Auxílio-acidente'], [/AUXILIO.?DOENCA|INCAPACIDADE TEMPORARIA/, 'Auxílio-doença'],
    [/APOSENTADORIA POR INVALIDEZ|INCAPACIDADE PERMANENTE/, 'Aposentadoria por incapacidade'],
    [/BENEFICIO ASSISTENCIAL|LOAS|AMPARO SOCIAL|DE PRESTACAO CONTINUADA/, 'BPC/LOAS'], [/PENSAO POR MORTE/, 'Pensão por morte'],
    [/SALARIO.?MATERNIDADE/, 'Salário-maternidade'], [/APOSENTADORIA POR IDADE|APOSENTADORIA RURAL/, 'Aposentadoria por idade'],
    [/APOSENTADORIA ESPECIAL|TEMPO DE CONTRIBUICAO|TEMPO DE SERVICO/, 'Aposentadoria'], [/REVISAO/, 'Revisão de benefício'],
  ];
  for (const [re, p] of M) if (re.test(n)) return p;
  return null;
}
// mesma regra das fases mostradas ao cliente (traducoes.js); recebe do mais antigo ao mais novo
function faseIndice(nomes: string[]): number {
  let f = 0;
  for (const raw of nomes) {
    const n = norm(raw);
    if (/CITACAO|CITAD|CONTESTACAO/.test(n)) f = Math.max(f, 1);
    if (/PERICIA|PERIT|LAUDO|AUDIENCIA/.test(n)) f = Math.max(f, 2);
    if (!/CONCLUS|AGUARD/.test(n) && /SENTENCA|JULGAMENTO|JULGAD|PROCEDENCIA|PROCEDENTE|HOMOLOGA.{0,30}ACORDO/.test(n)) f = Math.max(f, 3);
    if (/IMPLANTACAO|IMPLANTAD|REQUISICAO DE PEQUENO VALOR|\bRPV\b|PRECATORIO|REQUISITORIO|ALVARA|CUMPRIMENTO DE SENTENCA|LIQUIDACAO/.test(n)) f = 4;
  }
  const ult = norm(nomes[nomes.length - 1] || '');
  if (/ARQUIVAD|BAIXA DEFINITIVA|ARQUIVAMENTO/.test(ult) && !/DESARQUIV/.test(ult)) return 5;
  return f;
}
function maisDiasUteis(base: Date, n: number) {
  const d = new Date(base); let c = 0;
  while (c < n) { d.setUTCDate(d.getUTCDate() + 1); const w = d.getUTCDay(); if (w !== 0 && w !== 6) c++; }
  return d.toISOString().slice(0, 10);
}
const dataBR = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
let equipeOab: Map<string, string> | null = null;
async function responsavelDe(adm: any, oabs: string[] | null) {
  if (!equipeOab) { equipeOab = new Map(); const { data } = await adm.from('equipe').select('email,oab'); for (const e of data || []) if (e.oab) equipeOab.set(digitos(e.oab), e.email); }
  const l = (oabs || []).map((o) => digitos(o)).filter((o) => equipeOab!.has(o));
  return l.length === 1 ? equipeOab!.get(l[0])! : null;
}
// Interpreta as movimentacoes novas e cria tarefas, data de pericia e recado ao cliente
async function regras(adm: any, proc: any, linhas: any[]) {
  const limite = Date.now() - 15 * 864e5;   // historico antigo de um processo recem-importado nao vira tarefa
  const recentes = linhas.filter((l) => new Date(l.data_hora).getTime() >= limite).sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  if (!recentes.length) return;
  const resp = await responsavelDe(adm, proc.oabs);
  const tarefas: any[] = [];
  const hoje = hojeBR();
  for (const l of recentes) {
    const txt = norm(l.nome + ' ' + (l.complemento || ''));
    const dia = l.data_hora.slice(0, 10);
    // pericia designada: grava a data, avisa o cliente e cria a tarefa de orientar
    if (/PERICIA|PERITO|PERITA/.test(txt) && /DESIGNAD|AGENDAD|MARCAD|DESIGNO|DESIGNA/.test(txt)) {
      const m = (l.complemento || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:[^0-9]{1,12}(\d{1,2})\s*(?:h|:)\s*(\d{2})?)?/i);
      if (m) {
        const iso = m[3] + '-' + m[2] + '-' + m[1];
        if (iso >= hoje) {
          const hh = String(m[4] || '09').padStart(2, '0'), mm = String(m[5] || '00');
          const quando = iso + 'T' + hh + ':' + mm + ':00-03:00';
          if (!proc.pericia_em || String(proc.pericia_em).slice(0, 10) !== iso) {
            await adm.from('processos').update({ pericia_em: quando }).eq('id', proc.id);
            const recado = 'Sua perícia foi marcada para ' + dataBR(iso) + (m[4] ? ' às ' + hh + ':' + mm : '') + '. O escritório vai entrar em contato com as orientações e o local. Separe seus exames, atestados e um documento com foto.';
            await adm.from('notas').insert({ processo_id: proc.id, texto: recado, autor: 'Aviso automático' }).then(() => null, () => null);
          }
          const pr = new Date(iso + 'T12:00:00Z'); pr.setUTCDate(pr.getUTCDate() - 3);
          tarefas.push({ tipo: 'pericia', titulo: 'Orientar o cliente sobre a perícia de ' + dataBR(iso), detalhe: (l.complemento || '').slice(0, 600), prazo: pr.toISOString().slice(0, 10) < hoje ? hoje : pr.toISOString().slice(0, 10), chave: 'pericia:' + proc.id + ':' + iso });
        }
      }
    }
    // intimacao com prazo expresso: tarefa com a data (dias uteis contados da publicacao)
    if (l.nome.startsWith('Publica')) {
      const pm = txt.match(/PRAZO (?:LEGAL )?(?:COMUM )?(?:DE )?(\d{1,3})\s*(?:\(?[A-Z]+(?: [A-Z]+)?\)?\s*)?(?:DIAS|DIA)/);
      if (pm) {
        const n = Number(pm[1]);
        if (n > 0 && n <= 120) {
          const fim = maisDiasUteis(new Date(dia + 'T12:00:00Z'), n + 1);
          tarefas.push({ tipo: 'prazo', titulo: 'Prazo de ' + n + ' dias: ' + l.nome.replace(/^Publica\S+ oficial: /, '').slice(0, 80), detalhe: (l.complemento || '').slice(0, 900), prazo: fim, chave: 'prazo:' + l.hash });
        }
      }
    }
    // sentenca / acordao / acordo
    const r = resultadoDe(l.nome.startsWith('Publica') ? (l.complemento || '') : l.nome + ' ' + (l.complemento || ''));
    if (r && /SENTENCA|ACORDAO|JULG|HOMOLOG|PROCEDEN|IMPROCED|EXTINC/.test(txt)) {
      const rot: Record<string, string> = { deferido: 'procedente', indeferido: 'improcedente', parcial: 'parcialmente procedente', acordo: 'acordo homologado', extinto: 'extinto sem mérito' };
      tarefas.push({ tipo: 'decisao', titulo: 'Decisão (' + (rot[r] || r) + '): analisar e avisar o cliente', detalhe: (l.complemento || l.nome).slice(0, 900), prazo: maisDiasUteis(new Date(dia + 'T12:00:00Z'), 2), chave: 'decisao:' + proc.id + ':' + dia + ':' + r });
    }
    // pagamento: RPV, precatorio, alvara
    if (/REQUISICAO DE PEQUENO VALOR|\bRPV\b|PRECATORIO|ALVARA|LEVANTAMENTO DE VALOR/.test(txt)) {
      tarefas.push({ tipo: 'pagamento', titulo: 'Pagamento no processo: conferir e lançar honorários', detalhe: (l.nome + ' ' + (l.complemento || '')).slice(0, 900), prazo: maisDiasUteis(new Date(dia + 'T12:00:00Z'), 3), chave: 'pagamento:' + proc.id + ':' + dia, gestores: true });
    }
  }
  // o processo mudou de fase (pelos andamentos do tribunal): tarefa de avisar o cliente pelo WhatsApp
  const FASES_N = ['Inicio', 'Resposta do INSS', 'Pericia', 'Decisao', 'Pagamento', 'Concluido'];
  if (proc.fase_nova != null && proc.fase_auto != null && Number(proc.fase_nova) > Number(proc.fase_auto)
      && recentes.some((l) => !String(l.nome).startsWith('Publica'))) {
    const f = Number(proc.fase_nova);
    tarefas.push({ tipo: 'aviso', titulo: 'Avisar o cliente: processo na fase ' + (['Início', 'Resposta do INSS', 'Perícia', 'Decisão', 'Pagamento', 'Concluído'][f] || FASES_N[f] || f), detalhe: null, prazo: hoje, chave: 'aviso:' + proc.id + ':' + f });
  }
  if (!tarefas.length) return;
  const linhasT = tarefas.map((t) => ({ tipo: t.tipo, titulo: t.titulo.slice(0, 160), detalhe: t.detalhe || null, prazo: t.prazo, chave: t.chave,
    processo_id: proc.id, cliente_id: proc.cliente_id, responsavel: t.gestores ? null : resp }));
  await adm.from('tarefas').upsert(linhasT, { onConflict: 'chave', ignoreDuplicates: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.agendado) {
      const admA = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
      return resp(await agendada(admA, req.headers.get('x-lanhi-agenda') || ''));
    }
    if (body?.equipeRecuperar) {
      const admR = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
      return resp(await equipeRecuperar(admR, String(body.email || ''), String(body.codigo || '')));
    }
    if (body?.equipeNovaSenha) {
      const admN = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
      return resp(await equipeNovaSenha(admN, String(body.email || ''), String(body.mestra || ''), String(body.nova || '')));
    }
    if (body?.equipeEntrar) {
      const admL = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
      return resp(await equipeEntrar(admL, String(body.email || ''), String(body.senha || '')));
    }
    const auth = req.headers.get('Authorization') || '';
    const usr = createClient(URL_SB, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const token = auth.split(' ').pop() || '';
    const { data: u } = await usr.auth.getUser(token);
    if (!u?.user) return resp({ ok: false, motivo: 'sessao' });

    if (body?.desafio || body?.desbloquear) {
      const admD = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
      if (body.desafio) return resp(await novoDesafio(admD, u.user.id));
      return resp(await conferirDigital(admD, u.user.id, sessaoDoToken(token), body.desbloquear || {}));
    }

    if (body?.equipe) {
      const eq = await usr.rpc('is_equipe');
      if (eq.error || eq.data !== true) return resp({ ok: false, motivo: 'sessao' });
      const admE = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
      const filtro = 'ultima_sincronizacao.is.null,ultima_sincronizacao.lt.' + new Date(Date.now() - 2 * 36e5).toISOString();
      const { data: lista } = await admE.from('processos').select('id,numero_cnj').eq('ativo', true).or(filtro)
        .order('ultima_sincronizacao', { ascending: true, nullsFirst: true }).limit(8);
      let novas = 0, feitos = 0;
      for (const p of lista || []) { novas += await atualizar(admE, p.id, p.numero_cnj, null).catch(() => 0); feitos++; }
      const { count: restantes } = await admE.from('processos').select('id', { count: 'exact', head: true }).eq('ativo', true).or(filtro);
      return resp({ ok: true, atualizados: feitos, novas, restantes: restantes || 0 });
    }

    if (body?.equipeConsulta || body?.equipeConsultaResumo || body?.importarLevantamento || body?.importarClickup) {
      const eq = await usr.rpc('is_equipe');
      if (eq.error || eq.data !== true) return resp({ ok: false, motivo: 'sessao' });
      const admC = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
      const { data: eu } = await admC.from('equipe').select('email,admin,cpf,nome_completo,oab,escritorio_id')
        .eq('email', String(u.user.email || '').toLowerCase()).maybeSingle();
      if (!eu) return resp({ ok: false, motivo: 'sessao' });
      if (body.importarLevantamento) return resp(await importarLevantamento(admC, eu, body));
      if (body.importarClickup) return resp(await importarClickup(admC, eu, body));
      return resp(body.equipeConsulta ? await equipeConsulta(admC, eu, body) : await equipeConsultaResumo(admC, eu, body));
    }

    const est = await usr.rpc('estado_acesso');
    if (est.error || !est.data?.vinculado || !est.data?.pin_ok) return resp({ ok: false, motivo: 'sessao' });

    const adm = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });
    const { data: cli } = await adm.from('clientes').select('id,nome,escritorio_id')
      .or(`user_id.eq.${u.user.id},google_user_id.eq.${u.user.id}`).limit(1).maybeSingle();
    if (!cli) return resp({ ok: false, motivo: 'sessao' });
    const oabsCli = await oabsDo(adm, cli.escritorio_id);

    if (body?.buscarCpf) {
      const desde1 = new Date(Date.now() - 36e5).toISOString();
      const { count: c1 } = await adm.from('consultas_log').select('id', { count: 'exact', head: true })
        .eq('cliente_id', cli.id).gte('criado_em', desde1);
      if ((c1 || 0) >= LIMITE_HORA) return resp({ ok: false, motivo: 'limite' });
      let pubs: any[];
      try { pubs = await djenPorNome(cli.nome, oabsCli); }
      catch (_) {
        await adm.from('consultas_log').insert({ cliente_id: cli.id, numero_cnj: null, resultado: 'cpf: djen indisponível' });
        return resp({ ok: false, motivo: 'indisponivel' });
      }
      const porNumero = new Map<string, any[]>();
      for (const p of pubs) {
        if (!temOab(p, oabsCli) || !nomeConfere(cli.nome, p)) continue;
        const n = numeroDoItem(p);
        if (!cnjValido(n)) continue;
        if (!porNumero.has(n)) porNumero.set(n, []);
        porNumero.get(n)!.push(p);
      }
      const { data: ja } = await adm.from('processos').select('numero_cnj').eq('cliente_id', cli.id);
      const tem = new Set((ja || []).map((x: any) => x.numero_cnj));
      let novos = 0;
      for (const [n, lista] of [...porNumero.entries()].slice(0, 15)) {
        if (tem.has(n)) continue;
        const { data: np } = await adm.from('processos')
          .insert({ cliente_id: cli.id, numero_cnj: n, ativo: true, vinculo: 'automatico' }).select('id').single();
        if (np) { novos++; await atualizar(adm, np.id, n, lista).catch(() => 0); }
      }
      await adm.from('consultas_log').insert({ cliente_id: cli.id, numero_cnj: null,
        resultado: `cpf: ${pubs.length} publicações, ${porNumero.size} processos conferidos, ${novos} novos` });
      return resp({ ok: true, encontrados: porNumero.size, novos });
    }
    const numero = digitos(body?.numero);
    if (!cnjValido(numero)) return resp({ ok: false, motivo: 'numero' });

    const { data: proc } = await adm.from('processos').select('id,ultima_sincronizacao')
      .eq('cliente_id', cli.id).eq('numero_cnj', numero).maybeSingle();
    if (proc) {
      const velho = !proc.ultima_sincronizacao || Date.now() - new Date(proc.ultima_sincronizacao).getTime() > ATUALIZA_HORAS * 36e5;
      const novas = velho ? await atualizar(adm, proc.id, numero, null) : 0;
      return resp({ ok: true, ja: true, atualizado: velho, novas });
    }
    if (body?.atualizar) return resp({ ok: false, motivo: 'nao_vinculado' });

    const desde = new Date(Date.now() - 36e5).toISOString();
    const { count } = await adm.from('consultas_log').select('id', { count: 'exact', head: true })
      .eq('cliente_id', cli.id).gte('criado_em', desde);
    if ((count || 0) >= LIMITE_HORA) return resp({ ok: false, motivo: 'limite' });

    let pubs: any[];
    try { pubs = await djen(numero); }
    catch (e) {
      await adm.from('consultas_log').insert({ cliente_id: cli.id, numero_cnj: numero, resultado: 'djen indisponível' });
      return resp({ ok: false, motivo: 'indisponivel' });
    }
    const nossas = pubs.filter((p) => temOab(p, oabsCli));
    const confere = nossas.some((p) => nomeConfere(cli.nome, p));
    await adm.from('consultas_log').insert({ cliente_id: cli.id, numero_cnj: numero,
      resultado: !nossas.length ? 'sem publicação com nossa OAB' : (confere ? 'vinculado' : 'nome não confere') });
    if (!confere) {
      // Nenhuma fonte publica comprovou o vinculo: o pedido vai para a equipe conferir e vincular.
      await adm.from('pedidos_vinculo').upsert({ cliente_id: cli.id, numero_cnj: numero,
        motivo: !nossas.length ? 'sem publicação com OAB do escritório' : 'nome não confere na publicação' },
        { onConflict: 'cliente_id,numero_cnj', ignoreDuplicates: true });
      return resp({ ok: false, motivo: 'pedido' });
    }

    const { data: novo, error } = await adm.from('processos')
      .insert({ cliente_id: cli.id, numero_cnj: numero, ativo: true, vinculo: 'automatico' }).select('id').single();
    if (error || !novo) return resp({ ok: false, motivo: 'indisponivel' });
    await atualizar(adm, novo.id, numero, nossas).catch(() => 0);
    return resp({ ok: true, novo: true });
  } catch (e) {
    console.error(e);
    return resp({ ok: false, motivo: 'indisponivel' });
  }
});
