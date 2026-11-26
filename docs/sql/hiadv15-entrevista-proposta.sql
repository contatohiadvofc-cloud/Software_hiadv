-- HiAdv 15 (26/11/2026): Recrutamento — chamar para entrevista (presencial ou vídeo) e fazer proposta.
-- O convite e a proposta ficam prontos para o gestor enviar (WhatsApp/e-mail); nada é enviado sozinho.
-- O candidato responde por um link com código (sem login): confirmar, pedir outro horário, aceitar ou recusar.
-- Pode rodar mais de uma vez. Rodar primeiro no projeto de teste.

alter table public.rh_candidaturas add column if not exists entrevista jsonb;
alter table public.rh_candidaturas add column if not exists proposta jsonb;
alter table public.rh_candidaturas add column if not exists resposta jsonb;
alter table public.rh_candidaturas add column if not exists token text;
update public.rh_candidaturas set token = encode(extensions.gen_random_bytes(18), 'hex') where token is null;
alter table public.rh_candidaturas alter column token set default encode(extensions.gen_random_bytes(18), 'hex');
create unique index if not exists rh_cand_token on public.rh_candidaturas (token);

create or replace function public.rh_candidaturas_da_vaga(p_vaga uuid)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); r json;
begin
  if not public.is_equipe() or not exists (select 1 from public.rh_vagas where id = p_vaga and escritorio_id = esc) then raise exception 'Acesso negado.'; end if;
  select coalesce(json_agg(c order by c.criado_em desc), '[]'::json) into r from (
    select id, nome, email, whatsapp, cidade, uf, linkedin, curriculo_path, respostas, banco_talentos, etapa, nota, obs, criado_em,
           entrevista, proposta, resposta, case when public.sou_admin() then token end as token
      from public.rh_candidaturas where vaga_id = p_vaga) c;
  return r;
end $$;

create or replace function public.rh_entrevista_salvar(p_id uuid, p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); nm text; modo text := p->>'modo'; d date; h text := p->>'hora'; dur int; loc text; lk text;
begin
  if not public.sou_admin() then return json_build_object('ok', false, 'erro', 'Só o gestor chama para entrevista.'); end if;
  select nome into nm from public.rh_candidaturas where id = p_id and escritorio_id = esc;
  if nm is null then return json_build_object('ok', false, 'erro', 'Candidatura não encontrada.'); end if;
  if modo not in ('presencial', 'video') then return json_build_object('ok', false, 'erro', 'Escolha presencial ou por vídeo.'); end if;
  begin d := (p->>'data')::date; exception when others then d := null; end;
  if d is null or d < current_date then return json_build_object('ok', false, 'erro', 'Escolha uma data a partir de hoje.'); end if;
  if h !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return json_build_object('ok', false, 'erro', 'Horário inválido.'); end if;
  dur := coalesce(nullif(p->>'duracao','')::int, 45);
  if dur < 10 or dur > 240 then return json_build_object('ok', false, 'erro', 'A duração vai de 10 a 240 minutos.'); end if;
  loc := left(nullif(btrim(p->>'local'), ''), 300); lk := left(nullif(btrim(p->>'link'), ''), 300);
  if modo = 'presencial' and loc is null then return json_build_object('ok', false, 'erro', 'Informe o endereço da entrevista.'); end if;
  if lk is not null and lk !~* '^https://' then return json_build_object('ok', false, 'erro', 'O link da chamada precisa começar com https://'); end if;
  update public.rh_candidaturas set entrevista = jsonb_build_object('modo', modo, 'data', d, 'hora', h, 'duracao', dur, 'local', loc, 'link', lk,
      'com', left(nullif(btrim(p->>'com'), ''), 200), 'levar', left(nullif(btrim(p->>'levar'), ''), 300), 'gravacao', coalesce((p->>'gravacao')::boolean, false), 'em', now()),
    resposta = case when resposta->>'tipo' in ('confirmar', 'outro_horario') then null else resposta end,
    etapa = case when etapa in ('recebido', 'triagem', 'teste') then 'entrevista' else etapa end, atualizado_em = now()
  where id = p_id;
  perform public.auditar('recrutamento', nm || ': entrevista ' || modo || ' em ' || to_char(d, 'DD/MM/YYYY') || ' ' || h, p_id::text);
  return json_build_object('ok', true);
end $$;

create or replace function public.rh_proposta_salvar(p_id uuid, p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); nm text; sal numeric; ini date; ate date;
begin
  if not public.sou_admin() then return json_build_object('ok', false, 'erro', 'Só o gestor faz proposta.'); end if;
  select nome into nm from public.rh_candidaturas where id = p_id and escritorio_id = esc;
  if nm is null then return json_build_object('ok', false, 'erro', 'Candidatura não encontrada.'); end if;
  if length(btrim(coalesce(p->>'cargo', ''))) < 4 then return json_build_object('ok', false, 'erro', 'Informe o cargo.'); end if;
  begin sal := (p->>'salario')::numeric; exception when others then sal := null; end;
  if sal is null or sal <= 0 or sal > 1000000 then return json_build_object('ok', false, 'erro', 'Informe o salário.'); end if;
  begin ini := (p->>'inicio')::date; ate := (p->>'responder_ate')::date; exception when others then ini := null; end;
  if ini is null or ini < current_date then return json_build_object('ok', false, 'erro', 'A data de início precisa ser a partir de hoje.'); end if;
  if ate is null or ate < current_date or ate > ini then return json_build_object('ok', false, 'erro', 'O prazo de resposta vai de hoje até a data de início.'); end if;
  if jsonb_typeof(coalesce(p->'beneficios', '[]')) <> 'array' or jsonb_array_length(coalesce(p->'beneficios', '[]')) > 20 then return json_build_object('ok', false, 'erro', 'Até 20 benefícios.'); end if;
  update public.rh_candidaturas set proposta = jsonb_build_object('cargo', left(btrim(p->>'cargo'), 100), 'regime', left(coalesce(p->>'regime', 'CLT'), 40), 'salario', sal,
      'bonus', left(nullif(btrim(p->>'bonus'), ''), 120), 'jornada', left(nullif(btrim(p->>'jornada'), ''), 80), 'local', left(nullif(btrim(p->>'local'), ''), 120),
      'beneficios', coalesce(p->'beneficios', '[]'), 'inicio', ini, 'responder_ate', ate, 'mensagem', left(nullif(btrim(p->>'mensagem'), ''), 1000), 'em', now()),
    resposta = case when resposta->>'tipo' in ('aceitar', 'recusar') then null else resposta end,
    etapa = case when etapa in ('contratado') then etapa else 'proposta' end, atualizado_em = now()
  where id = p_id;
  perform public.auditar('recrutamento', nm || ': proposta feita', p_id::text);
  return json_build_object('ok', true);
end $$;

-- ===== Resposta do candidato (sem login, pelo código do link) =====
create or replace function public.rh_resposta_ver(p_token text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('nome', split_part(c.nome, ' ', 1), 'escritorio', e.nome, 'vaga', v.titulo, 'entrevista', c.entrevista,
         'proposta', c.proposta, 'resposta', c.resposta, 'etapa', c.etapa)
    from public.rh_candidaturas c join public.rh_vagas v on v.id = c.vaga_id join public.escritorios e on e.id = c.escritorio_id
   where c.token = p_token and length(p_token) = 36;
$$;

create or replace function public.rh_resposta_enviar(p_token text, p_tipo text, p_msg text)
returns json language plpgsql security definer set search_path = public as $$
declare c public.rh_candidaturas; m text := left(nullif(btrim(coalesce(p_msg, '')), ''), 500);
begin
  if length(coalesce(p_token, '')) <> 36 then return json_build_object('ok', false, 'erro', 'Link inválido.'); end if;
  select * into c from public.rh_candidaturas where token = p_token;
  if c.id is null then return json_build_object('ok', false, 'erro', 'Link inválido.'); end if;
  if p_tipo in ('confirmar', 'outro_horario') and c.entrevista is null then return json_build_object('ok', false, 'erro', 'Não há entrevista marcada.'); end if;
  if p_tipo in ('aceitar', 'recusar') and c.proposta is null then return json_build_object('ok', false, 'erro', 'Não há proposta.'); end if;
  if p_tipo not in ('confirmar', 'outro_horario', 'aceitar', 'recusar') then return json_build_object('ok', false, 'erro', 'Resposta inválida.'); end if;
  if p_tipo = 'outro_horario' and m is null then return json_build_object('ok', false, 'erro', 'Diga quais dias e horários ficam melhores.'); end if;
  if p_tipo in ('aceitar', 'recusar') and (c.proposta->>'responder_ate')::date < current_date then return json_build_object('ok', false, 'erro', 'O prazo para responder esta proposta terminou. Fale com o escritório.'); end if;
  update public.rh_candidaturas set resposta = jsonb_build_object('tipo', p_tipo, 'msg', m, 'em', now()),
    etapa = case when p_tipo = 'aceitar' then 'contratado' else etapa end, atualizado_em = now()
  where id = c.id;
  return json_build_object('ok', true);
end $$;

revoke all on function public.rh_entrevista_salvar(uuid, jsonb), public.rh_proposta_salvar(uuid, jsonb) from anon, public;
grant execute on function public.rh_entrevista_salvar(uuid, jsonb), public.rh_proposta_salvar(uuid, jsonb) to authenticated;
grant execute on function public.rh_resposta_ver(text), public.rh_resposta_enviar(text, text, text) to anon, authenticated;
