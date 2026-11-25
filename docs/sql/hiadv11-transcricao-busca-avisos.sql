-- HiAdv 11 (25/11/2026): transcrição de áudios, busca no histórico e avisos de chamada.
-- Transcrição: feita pela função "transcrever" (chave cadastrada pelos gestores no painel: HIADV_TRANSCRICAO_CHAVE).

alter table public.chat_mensagens add column if not exists transcricao text check (transcricao is null or length(transcricao) <= 20000);
alter table public.chat_mensagens add column if not exists transcrito_em timestamptz;
create index if not exists chat_msg_busca_idx on public.chat_mensagens using gin (to_tsvector('portuguese', coalesce(texto, '') || ' ' || coalesce(transcricao, '')));

-- guarda a transcrição de um áudio de conversa da qual eu participo
create or replace function public.chat_transcricao_salvar(p_msg uuid, p_texto text)
returns json language plpgsql security definer set search_path = public as $$
declare m public.chat_mensagens;
begin
  select * into m from public.chat_mensagens where id = p_msg;
  if m.id is null or m.apagado_em is not null or not public.chat_participo(m.conversa_id) then return json_build_object('ok', false, 'erro', 'Mensagem não encontrada.'); end if;
  if coalesce(m.anexo ->> 'tipo', '') not like 'audio/%' then return json_build_object('ok', false, 'erro', 'Só áudios são transcritos.'); end if;
  update public.chat_mensagens set transcricao = left(btrim(p_texto), 20000), transcrito_em = now() where id = p_msg;
  return json_build_object('ok', true);
end $$;

-- busca no que foi escrito ou falado (transcrição) nas conversas da minha equipe
create or replace function public.chat_buscar(p_termo text)
returns json language plpgsql stable security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); esc uuid := public.meu_escritorio(); t text := btrim(coalesce(p_termo, '')); r json;
begin
  if not public.is_equipe() or length(t) < 3 then return '[]'::json; end if;
  select coalesce(json_agg(x order by x.criado_em desc), '[]'::json) into r from (
    select m.id, m.conversa_id, m.autor, m.texto, m.transcricao, m.anexo, m.criado_em, c.tipo, c.titulo
      from public.chat_mensagens m join public.chat_conversas c on c.id = m.conversa_id
     where c.escritorio_id = esc and m.apagado_em is null
       and (c.tipo = 'equipe' or exists (select 1 from public.chat_membros b where b.conversa_id = c.id and b.email = eu))
       and (m.texto ilike '%' || t || '%' or m.transcricao ilike '%' || t || '%'
            or to_tsvector('portuguese', coalesce(m.texto, '') || ' ' || coalesce(m.transcricao, '')) @@ plainto_tsquery('portuguese', t))
     order by m.criado_em desc limit 60) x;
  return r;
end $$;

-- chamadas acontecendo agora nas minhas conversas (para tocar o aviso de chamada)
create or replace function public.reuniao_minhas_ativas()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', r.id, 'conversa_id', r.conversa_id, 'video', r.video, 'iniciada_por', r.iniciada_por, 'inicio', r.inicio, 'participantes', r.participantes)), '[]'::json)
    from public.reunioes r join public.chat_conversas c on c.id = r.conversa_id
   where r.fim is null and r.inicio > now() - interval '2 hours' and c.escritorio_id = public.meu_escritorio() and public.chat_participo(c.id);
$$;

revoke all on function public.chat_transcricao_salvar(uuid, text), public.chat_buscar(text), public.reuniao_minhas_ativas() from public, anon;
grant execute on function public.chat_transcricao_salvar(uuid, text), public.chat_buscar(text), public.reuniao_minhas_ativas() to authenticated;
