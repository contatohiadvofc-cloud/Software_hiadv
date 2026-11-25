// Transcreve um áudio da conversa da equipe e guarda o texto junto da mensagem (para ler e buscar depois).
// O áudio é baixado com o login de quem pediu: só transcreve quem participa da conversa.
// Segredos (cadastrados pelos gestores no painel): HIADV_TRANSCRICAO_CHAVE; opcional HIADV_TRANSCRICAO_URL e HIADV_TRANSCRICAO_MODELO
// (padrão: serviço compatível com Whisper da Groq, modelo whisper-large-v3-turbo, em português).
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' }
const resp = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: cors })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const chave = Deno.env.get('HIADV_TRANSCRICAO_CHAVE')
  if (!chave) return resp({ ok: false, configurada: false, erro: 'A transcrição ainda não foi ligada pelos gestores.' })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  // Trecho de reunião: o aparelho de cada participante manda só a própria voz, em pedaços; o áudio não é guardado.
  if ((req.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
    const f = await req.formData()
    const reuniao = String(f.get('reuniao') ?? ''); const arquivo = f.get('arquivo')
    if (!/^[0-9a-f-]{36}$/.test(reuniao) || !(arquivo instanceof File)) return resp({ ok: false, erro: 'Pedido inválido.' }, 400)
    if (arquivo.size > 8 * 1024 * 1024) return resp({ ok: false, erro: 'Trecho grande demais.' }, 413)
    const texto = await transcreverArquivo(chave, arquivo, arquivo.name || 'trecho.webm')
    if (texto === null) return resp({ ok: false, erro: 'O serviço de transcrição não respondeu.' }, 502)
    if (!texto) return resp({ ok: true, texto: '' })
    const g = await sb.rpc('reuniao_fala', { p_reuniao: reuniao, p_texto: texto })
    if (g.error || (g.data as { ok?: boolean })?.ok === false) return resp({ ok: false, erro: 'Não deu para guardar a fala.' }, 403)
    return resp({ ok: true, texto })
  }
  let corpo: { msg?: string; path?: string }
  try { corpo = await req.json() } catch { return resp({ ok: false, erro: 'Pedido inválido.' }, 400) }
  if (!corpo.msg || !corpo.path || !/^[0-9a-f-]{36}\//.test(corpo.path)) return resp({ ok: false, erro: 'Pedido inválido.' }, 400)
  const arq = await sb.storage.from('chat').download(corpo.path)
  if (arq.error || !arq.data) return resp({ ok: false, erro: 'Áudio não encontrado.' }, 404)
  if (arq.data.size > 25 * 1024 * 1024) return resp({ ok: false, erro: 'Áudio grande demais para transcrever.' }, 413)
  const texto = await transcreverArquivo(chave, arq.data, corpo.path.split('/').pop() ?? 'audio.webm')
  if (texto === null) return resp({ ok: false, erro: 'O serviço de transcrição não respondeu. Tente de novo em instantes.' }, 502)
  if (!texto) return resp({ ok: false, erro: 'Não deu para entender o áudio.' })
  const g = await sb.rpc('chat_transcricao_salvar', { p_msg: corpo.msg, p_texto: texto })
  if (g.error || (g.data as { ok?: boolean })?.ok === false) return resp({ ok: false, erro: 'Não deu para guardar a transcrição.' }, 403)
  return resp({ ok: true, texto })
})

async function transcreverArquivo(chave: string, arquivo: Blob, nome: string): Promise<string | null> {
  const form = new FormData()
  form.append('file', arquivo, nome)
  form.append('model', Deno.env.get('HIADV_TRANSCRICAO_MODELO') ?? 'whisper-large-v3-turbo')
  form.append('language', 'pt')
  form.append('response_format', 'json')
  const url = Deno.env.get('HIADV_TRANSCRICAO_URL') ?? 'https://api.groq.com/openai/v1/audio/transcriptions'
  try {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${chave}` }, body: form })
    if (!r.ok) return null
    return String(((await r.json()) as { text?: string }).text ?? '').trim()
  } catch { return null }
}
