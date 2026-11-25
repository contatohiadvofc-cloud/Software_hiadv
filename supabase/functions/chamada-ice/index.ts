// Entrega servidores de conexão para as chamadas da equipe.
// Com TURN configurado (Cloudflare Realtime TURN), a chamada atravessa firewalls e redes de operadora,
// mantendo áudio e vídeo estáveis mesmo entre cidades diferentes. Sem configuração, devolve só STUN.
// Segredos (cadastrados pelos gestores no painel do Supabase): CF_TURN_KEY_ID e CF_TURN_API_TOKEN.
import { createClient } from 'npm:@supabase/supabase-js@2'

const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const auth = req.headers.get('Authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: equipe } = await sb.rpc('is_equipe')
  if (equipe !== true) return new Response(JSON.stringify({ iceServers: [] }), { status: 403, headers: cors })
  const id = Deno.env.get('CF_TURN_KEY_ID'); const token = Deno.env.get('CF_TURN_API_TOKEN')
  if (!id || !token) return new Response(JSON.stringify({ iceServers: STUN, turn: false }), { headers: cors })
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 4 * 3600 }),
    })
    if (!r.ok) throw new Error(String(r.status))
    const j = await r.json() as { iceServers?: unknown }
    const lista = Array.isArray(j.iceServers) ? j.iceServers : [j.iceServers]
    return new Response(JSON.stringify({ iceServers: [...STUN, ...lista.filter(Boolean)], turn: true }), { headers: cors })
  } catch {
    return new Response(JSON.stringify({ iceServers: STUN, turn: false }), { headers: cors })
  }
})
