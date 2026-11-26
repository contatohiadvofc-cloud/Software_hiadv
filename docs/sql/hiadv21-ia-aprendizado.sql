-- HiAdv 21 (26/11/2026): a IA aprende com o próprio escritório.
-- A equipe avalia cada rascunho ("ajudou" / "não era isso, eu queria..."). Os gestores do escritório transformam
-- isso em orientações. A IA passa a seguir as orientações aprovadas, SÓ naquele escritório.
-- Limites: a orientação é texto (nunca código), não muda regras, permissões nem o núcleo do HiAdv, e não vale para outros escritórios.

create table if not exists public.ia_feedback (
  id bigint generated always as identity primary key,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  quem text not null,
  acao text not null,
  pedido text,
  util boolean not null,
  como_queria text,
  status text not null default 'nova' check (status in ('nova', 'aprovada', 'recusada')),
  orientacao_id bigint,
  criado_em timestamptz not null default now(),
  decidido_por text, decidido_em timestamptz
);
create index if not exists ia_feedback_fila on public.ia_feedback (escritorio_id, status, criado_em desc);
alter table public.ia_feedback enable row level security;

create table if not exists public.ia_orientacoes (
  id bigint generated always as identity primary key,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  acao text,                       -- null = vale para todas as tarefas da IA
  texto text not null check (length(texto) between 5 and 400),
  ativo boolean not null default true,
  usos int not null default 0,
  criado_por text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);
create index if not exists ia_orientacoes_esc on public.ia_orientacoes (escritorio_id, ativo);
alter table public.ia_orientacoes enable row level security;
-- sem políticas: tudo passa pelas funções abaixo

-- texto que tenta mexer em regra, segurança, sistema ou outro escritório não vira orientação
create or replace function public.ia_orientacao_problema(p_texto text)
returns text language sql immutable set search_path = public as $$
  select case
    when length(btrim(coalesce(p_texto, ''))) < 5 then 'Escreva a orientação com pelo menos 5 caracteres.'
    when length(btrim(p_texto)) > 400 then 'A orientação pode ter até 400 caracteres.'
    when p_texto ~* '(ignor|desconsider|esque[çc]a|desativ|burl|contorn|sobrescrev)\w*\s+(as|a|os|o|suas|todas)?\s*(regra|instru|segur|limit|restri|polít|sistema)'
      or p_texto ~* '(senha|token|chave|api|service.?role|admin|permiss|outro[s]? escrit|todos os escrit|banco de dados|sql|c[óo]digo[- ]fonte|javascript|<script|```)'
      then 'Essa orientação mexe em regras, segurança ou no sistema. A IA só aprende o jeito de escrever e de responder do seu escritório.'
  end
$$;

create or replace function public.ia_avaliar(p_acao text, p_pedido text, p_util boolean, p_como text)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); eu text := lower(auth.jwt() ->> 'email');
begin
  if not public.is_equipe() or esc is null then return json_build_object('ok', false, 'erro', 'Somente a equipe.'); end if;
  if p_acao is null or p_acao not in ('resumo_intimacao', 'quesitos', 'minuta', 'resumo_documento') then return json_build_object('ok', false, 'erro', 'Tarefa inválida.'); end if;
  if p_util is null then return json_build_object('ok', false, 'erro', 'Diga se ajudou.'); end if;
  if (select count(*) from public.ia_feedback where quem = eu and criado_em > now() - interval '1 hour') >= 60 then
    return json_build_object('ok', false, 'erro', 'Muitas avaliações seguidas. Aguarde um pouco.'); end if;
  insert into public.ia_feedback (escritorio_id, quem, acao, pedido, util, como_queria, status)
  values (esc, eu, p_acao, left(btrim(coalesce(p_pedido, '')), 600), p_util, nullif(left(btrim(coalesce(p_como, '')), 1000), ''),
          case when p_util or nullif(btrim(coalesce(p_como, '')), '') is null then 'recusada' else 'nova' end);
  return json_build_object('ok', true);
end $$;

-- tela dos gestores: o que a equipe pediu, as orientações e como a IA está indo
create or replace function public.ia_aprendizado()
returns json language plpgsql stable security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio();
begin
  if not public.hiadv_sou_gestor() or esc is null then raise exception 'Somente os gestores do escritório.'; end if;
  return json_build_object(
    'pendentes', coalesce((select json_agg(json_build_object('id', f.id, 'quem', f.quem, 'acao', f.acao, 'pedido', f.pedido, 'comoQueria', f.como_queria, 'em', f.criado_em) order by f.criado_em desc)
                  from (select * from public.ia_feedback where escritorio_id = esc and status = 'nova' order by criado_em desc limit 100) f), '[]'::json),
    'orientacoes', coalesce((select json_agg(json_build_object('id', o.id, 'acao', o.acao, 'texto', o.texto, 'ativo', o.ativo, 'usos', o.usos, 'criadoPor', o.criado_por, 'em', o.criado_em) order by o.ativo desc, o.criado_em desc)
                  from public.ia_orientacoes o where o.escritorio_id = esc), '[]'::json),
    'resumo', json_build_object(
      'uteis', (select count(*) from public.ia_feedback where escritorio_id = esc and util and criado_em > now() - interval '30 days'),
      'naoUteis', (select count(*) from public.ia_feedback where escritorio_id = esc and not util and criado_em > now() - interval '30 days')));
end $$;

create or replace function public.ia_orientacao_salvar(p_id bigint, p_acao text, p_texto text, p_feedback bigint)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); eu text := lower(auth.jwt() ->> 'email'); tex text := btrim(coalesce(p_texto, '')); prob text; nid bigint;
begin
  if not public.hiadv_sou_gestor() or esc is null then return json_build_object('ok', false, 'erro', 'Somente os gestores do escritório.'); end if;
  if p_acao is not null and p_acao not in ('resumo_intimacao', 'quesitos', 'minuta', 'resumo_documento') then return json_build_object('ok', false, 'erro', 'Tarefa inválida.'); end if;
  prob := public.ia_orientacao_problema(tex);
  if prob is not null then return json_build_object('ok', false, 'erro', prob); end if;
  if p_id is null then
    if (select count(*) from public.ia_orientacoes where escritorio_id = esc and ativo) >= 40 then
      return json_build_object('ok', false, 'erro', 'O escritório já tem 40 orientações ligadas. Desligue alguma antes de criar outra.'); end if;
    insert into public.ia_orientacoes (escritorio_id, acao, texto, criado_por) values (esc, p_acao, tex, eu) returning id into nid;
  else
    update public.ia_orientacoes set acao = p_acao, texto = tex, atualizado_em = now() where id = p_id and escritorio_id = esc returning id into nid;
    if nid is null then return json_build_object('ok', false, 'erro', 'Orientação não encontrada.'); end if;
  end if;
  if p_feedback is not null then
    update public.ia_feedback set status = 'aprovada', orientacao_id = nid, decidido_por = eu, decidido_em = now() where id = p_feedback and escritorio_id = esc;
  end if;
  insert into public.auditoria (quem, tipo, acao, alvo, escritorio_id) values (eu, 'ia', case when p_id is null then 'criou' else 'editou' end || ' orientação da IA', left(tex, 200), esc);
  return json_build_object('ok', true, 'id', nid);
end $$;

create or replace function public.ia_orientacao_ativa(p_id bigint, p_ativo boolean)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); eu text := lower(auth.jwt() ->> 'email');
begin
  if not public.hiadv_sou_gestor() or esc is null then return json_build_object('ok', false, 'erro', 'Somente os gestores do escritório.'); end if;
  if p_ativo and (select count(*) from public.ia_orientacoes where escritorio_id = esc and ativo) >= 40 then
    return json_build_object('ok', false, 'erro', 'O escritório já tem 40 orientações ligadas.'); end if;
  update public.ia_orientacoes set ativo = coalesce(p_ativo, false), atualizado_em = now() where id = p_id and escritorio_id = esc;
  if not found then return json_build_object('ok', false, 'erro', 'Orientação não encontrada.'); end if;
  insert into public.auditoria (quem, tipo, acao, alvo, escritorio_id) values (eu, 'ia', case when p_ativo then 'ligou' else 'desligou' end || ' orientação da IA', p_id::text, esc);
  return json_build_object('ok', true);
end $$;

create or replace function public.ia_feedback_recusar(p_id bigint)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio();
begin
  if not public.hiadv_sou_gestor() or esc is null then return json_build_object('ok', false, 'erro', 'Somente os gestores do escritório.'); end if;
  update public.ia_feedback set status = 'recusada', decidido_por = lower(auth.jwt() ->> 'email'), decidido_em = now() where id = p_id and escritorio_id = esc and status = 'nova';
  return json_build_object('ok', true);
end $$;

-- usado pela função "ia" com a sessão de quem pediu: só as orientações ligadas do PRÓPRIO escritório
create or replace function public.ia_orientacoes_para(p_acao text)
returns text[] language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); r text[];
begin
  if not public.is_equipe() or esc is null then return array[]::text[]; end if;
  with o as (
    update public.ia_orientacoes set usos = usos + 1
     where id in (select id from public.ia_orientacoes where escritorio_id = esc and ativo and (acao is null or acao = p_acao) order by criado_em limit 40)
     returning texto, criado_em)
  select coalesce(array_agg(texto order by criado_em), array[]::text[]) into r from o;
  return r;
end $$;

revoke all on function public.ia_avaliar(text, text, boolean, text), public.ia_aprendizado(), public.ia_orientacao_salvar(bigint, text, text, bigint),
  public.ia_orientacao_ativa(bigint, boolean), public.ia_feedback_recusar(bigint), public.ia_orientacoes_para(text), public.ia_orientacao_problema(text) from anon, public;
grant execute on function public.ia_avaliar(text, text, boolean, text), public.ia_aprendizado(), public.ia_orientacao_salvar(bigint, text, text, bigint),
  public.ia_orientacao_ativa(bigint, boolean), public.ia_feedback_recusar(bigint), public.ia_orientacoes_para(text) to authenticated;
