-- HiAdv 12 (25/11/2026): transcrição das chamadas (decisão do Felipe: ligada sempre, com aviso visível na chamada).
-- Cada aparelho transcreve só a voz do próprio participante (função "transcrever"); o áudio não é guardado, só o texto (reuniao_falas).

create index if not exists reuniao_falas_idx on public.reuniao_falas (reuniao_id, falado_em);

-- chamadas anteriores da conversa, com quantas falas foram registradas
create or replace function public.reuniao_historico(p_conversa uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when public.chat_participo(p_conversa) then coalesce((select json_agg(x order by x.inicio desc) from (
    select r.id, r.video, r.iniciada_por, r.inicio, r.fim, r.participantes,
           (select count(*) from public.reuniao_falas f where f.reuniao_id = r.id) as falas
      from public.reunioes r where r.conversa_id = p_conversa order by r.inicio desc limit 30) x), '[]'::json) else '[]'::json end;
$$;

-- transcrição de uma chamada (quem participa da conversa lê)
create or replace function public.reuniao_falas_de(p_reuniao uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when exists (select 1 from public.reunioes r where r.id = p_reuniao and public.chat_participo(r.conversa_id)) then
    coalesce((select json_agg(json_build_object('autor', f.autor, 'texto', f.texto, 'falado_em', f.falado_em) order by f.falado_em)
      from public.reuniao_falas f where f.reuniao_id = p_reuniao), '[]'::json) else '[]'::json end;
$$;

-- a busca do histórico passa a achar também o que foi dito nas chamadas
create or replace function public.chat_buscar(p_termo text)
returns json language plpgsql stable security definer set search_path = public as $$
declare eu text := lower(auth.jwt() ->> 'email'); esc uuid := public.meu_escritorio(); t text := btrim(coalesce(p_termo, '')); r json;
begin
  if not public.is_equipe() or length(t) < 3 then return '[]'::json; end if;
  select coalesce(json_agg(x order by x.criado_em desc), '[]'::json) into r from (
    (select m.id, m.conversa_id, m.autor, m.texto, m.transcricao, m.anexo, m.criado_em, c.tipo, c.titulo, null::uuid as reuniao_id
      from public.chat_mensagens m join public.chat_conversas c on c.id = m.conversa_id
     where c.escritorio_id = esc and m.apagado_em is null
       and (c.tipo = 'equipe' or exists (select 1 from public.chat_membros b where b.conversa_id = c.id and b.email = eu))
       and (m.texto ilike '%' || t || '%' or m.transcricao ilike '%' || t || '%'
            or to_tsvector('portuguese', coalesce(m.texto, '') || ' ' || coalesce(m.transcricao, '')) @@ plainto_tsquery('portuguese', t))
     order by m.criado_em desc limit 60)
    union all
    (select f.id, r.conversa_id, f.autor, null, f.texto, null, f.falado_em, c.tipo, c.titulo, r.id
      from public.reuniao_falas f join public.reunioes r on r.id = f.reuniao_id join public.chat_conversas c on c.id = r.conversa_id
     where c.escritorio_id = esc
       and (c.tipo = 'equipe' or exists (select 1 from public.chat_membros b where b.conversa_id = c.id and b.email = eu))
       and (f.texto ilike '%' || t || '%' or to_tsvector('portuguese', f.texto) @@ plainto_tsquery('portuguese', t))
     order by f.falado_em desc limit 40)
  ) x;
  return r;
end $$;

revoke all on function public.reuniao_historico(uuid), public.reuniao_falas_de(uuid) from public, anon;
grant execute on function public.reuniao_historico(uuid), public.reuniao_falas_de(uuid) to authenticated;
