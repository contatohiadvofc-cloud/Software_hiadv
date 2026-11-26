-- HiAdv 14 (26/11/2026): Recrutamento, etapa 1 — vagas, página pública, candidatura e funil em cards.
-- Sem IA nesta etapa. Candidato não tem login: só envia pela função candidatura_enviar.
-- Dados mínimos (LGPD): nome, e-mail, WhatsApp, cidade/UF, LinkedIn, currículo, respostas. Nada de idade, foto, gênero etc.
-- Pode rodar mais de uma vez. Rodar primeiro no projeto de teste.

alter table public.escritorios add column if not exists slug text;
create unique index if not exists escritorios_slug_uk on public.escritorios (slug) where slug is not null;

create or replace function public.rh_slug(t text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(translate(coalesce(t, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc')), '[^a-z0-9]+', '-', 'g'));
$$;

create table if not exists public.rh_vagas (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  slug text not null,
  funcao text not null check (funcao in ('comercial','triagem','juridico','suporte','outra')),
  titulo text not null,
  regime text not null default 'CLT',
  modalidade text not null default 'Remoto',
  jornada text,
  cidade text,
  salario numeric(12,2),
  salario_obs text,
  mostrar_salario boolean not null default true,
  beneficios text[] not null default '{}',
  atividades text[] not null default '{}',
  requisitos text[] not null default '{}',
  diferenciais text[] not null default '{}',
  perguntas text[] not null default '{}',
  quantidade int not null default 1 check (quantidade between 1 and 50),
  inscricoes_ate date,
  status text not null default 'rascunho' check (status in ('rascunho','aberta','pausada','encerrada')),
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (escritorio_id, slug)
);
alter table public.rh_vagas enable row level security;

create table if not exists public.rh_candidaturas (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid not null references public.rh_vagas(id) on delete cascade,
  escritorio_id uuid not null references public.escritorios(id) on delete cascade,
  nome text not null,
  email text not null,
  whatsapp text not null,
  cidade text,
  uf text,
  linkedin text,
  curriculo_path text,
  respostas jsonb not null default '{}',
  consentimento_em timestamptz not null,
  banco_talentos boolean not null default false,
  etapa text not null default 'recebido' check (etapa in ('recebido','triagem','teste','entrevista','proposta','contratado','banco','nao_seguiu')),
  nota int check (nota between 1 and 5),
  obs text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  apagar_em date not null default (current_date + 180),
  unique (vaga_id, email)
);
alter table public.rh_candidaturas enable row level security;
create index if not exists rh_cand_vaga on public.rh_candidaturas (vaga_id, etapa);

-- Nenhuma leitura direta das tabelas: tudo pelas funções abaixo.
revoke all on public.rh_vagas, public.rh_candidaturas from anon, authenticated;

-- ===== Gestão (equipe; editar só gestor) =====
create or replace function public.rh_vaga_lista()
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); r json;
begin
  if not public.is_equipe() or esc is null then raise exception 'Acesso negado.'; end if;
  select coalesce(json_agg(x order by x.criado_em desc), '[]'::json) into r from (
    select v.*, (select slug from public.escritorios where id = esc) as escritorio_slug,
      (select count(*) from public.rh_candidaturas c where c.vaga_id = v.id) as total,
      (select count(*) from public.rh_candidaturas c where c.vaga_id = v.id and c.etapa = 'recebido') as novos
    from public.rh_vagas v where v.escritorio_id = esc) x;
  return r;
end $$;

create or replace function public.rh_vaga_salvar(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); vid uuid := nullif(p->>'id','')::uuid; tit text := btrim(coalesce(p->>'titulo',''));
        s text; base text; n int := 1; nome_esc text; esc_slug text;
        arr text[]; k text;
begin
  if not public.sou_admin() or esc is null then return json_build_object('ok', false, 'erro', 'Só o gestor pode criar ou editar vagas.'); end if;
  if length(tit) < 4 or length(tit) > 100 then return json_build_object('ok', false, 'erro', 'O cargo precisa ter entre 4 e 100 caracteres.'); end if;
  if coalesce(p->>'funcao','') not in ('comercial','triagem','juridico','suporte','outra') then return json_build_object('ok', false, 'erro', 'Escolha a função.'); end if;
  if (p->>'salario') is not null and (p->>'salario') <> '' and ((p->>'salario')::numeric < 0 or (p->>'salario')::numeric > 1000000) then return json_build_object('ok', false, 'erro', 'Salário inválido.'); end if;
  if (p->>'inscricoes_ate') is not null and (p->>'inscricoes_ate') <> '' and (p->>'inscricoes_ate')::date < current_date then return json_build_object('ok', false, 'erro', 'A data final das inscrições já passou.'); end if;
  foreach k in array array['beneficios','atividades','requisitos','diferenciais','perguntas'] loop
    if jsonb_typeof(coalesce(p->k, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p->k, '[]'::jsonb)) > 20 then
      return json_build_object('ok', false, 'erro', 'Cada lista pode ter no máximo 20 itens.'); end if;
    if exists (select 1 from jsonb_array_elements_text(coalesce(p->k, '[]'::jsonb)) e where length(e) > 300) then
      return json_build_object('ok', false, 'erro', 'Cada item pode ter no máximo 300 caracteres.'); end if;
  end loop;
  -- o escritório ganha um endereço curto na primeira vaga
  select nome, slug into nome_esc, esc_slug from public.escritorios where id = esc;
  if esc_slug is null then
    base := coalesce(nullif(public.rh_slug(nome_esc), ''), 'escritorio'); esc_slug := base;
    while exists (select 1 from public.escritorios where slug = esc_slug) loop n := n + 1; esc_slug := base || '-' || n; end loop;
    update public.escritorios set slug = esc_slug where id = esc;
  end if;
  if vid is null then
    base := coalesce(nullif(left(public.rh_slug(tit), 60), ''), 'vaga'); s := base; n := 1;
    while exists (select 1 from public.rh_vagas where escritorio_id = esc and slug = s) loop n := n + 1; s := base || '-' || n; end loop;
    insert into public.rh_vagas (escritorio_id, slug, funcao, titulo, criado_por) values (esc, s, p->>'funcao', tit, lower(auth.jwt()->>'email')) returning id into vid;
  elsif not exists (select 1 from public.rh_vagas where id = vid and escritorio_id = esc) then
    return json_build_object('ok', false, 'erro', 'Vaga não encontrada.');
  end if;
  update public.rh_vagas set
    funcao = p->>'funcao', titulo = tit,
    regime = left(coalesce(nullif(btrim(p->>'regime'),''), 'CLT'), 40),
    modalidade = left(coalesce(nullif(btrim(p->>'modalidade'),''), 'Remoto'), 40),
    jornada = left(nullif(btrim(p->>'jornada'),''), 80), cidade = left(nullif(btrim(p->>'cidade'),''), 80),
    salario = nullif(p->>'salario','')::numeric, salario_obs = left(nullif(btrim(p->>'salario_obs'),''), 120),
    mostrar_salario = coalesce((p->>'mostrar_salario')::boolean, true),
    beneficios = array(select btrim(e) from jsonb_array_elements_text(coalesce(p->'beneficios','[]')) e where btrim(e) <> ''),
    atividades = array(select btrim(e) from jsonb_array_elements_text(coalesce(p->'atividades','[]')) e where btrim(e) <> ''),
    requisitos = array(select btrim(e) from jsonb_array_elements_text(coalesce(p->'requisitos','[]')) e where btrim(e) <> ''),
    diferenciais = array(select btrim(e) from jsonb_array_elements_text(coalesce(p->'diferenciais','[]')) e where btrim(e) <> ''),
    perguntas = array(select btrim(e) from jsonb_array_elements_text(coalesce(p->'perguntas','[]')) e where btrim(e) <> ''),
    quantidade = greatest(1, least(50, coalesce(nullif(p->>'quantidade','')::int, 1))),
    inscricoes_ate = nullif(p->>'inscricoes_ate','')::date, atualizado_em = now()
  where id = vid;
  perform public.auditar('recrutamento', 'vaga salva: ' || tit, vid::text);
  return json_build_object('ok', true, 'id', vid);
end $$;

create or replace function public.rh_vaga_status(p_id uuid, p_status text)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); t text;
begin
  if not public.sou_admin() then return json_build_object('ok', false, 'erro', 'Só o gestor pode mudar a vaga.'); end if;
  if p_status not in ('rascunho','aberta','pausada','encerrada') then return json_build_object('ok', false, 'erro', 'Situação inválida.'); end if;
  update public.rh_vagas set status = p_status, atualizado_em = now() where id = p_id and escritorio_id = esc returning titulo into t;
  if t is null then return json_build_object('ok', false, 'erro', 'Vaga não encontrada.'); end if;
  perform public.auditar('recrutamento', 'vaga ' || p_status || ': ' || t, p_id::text);
  return json_build_object('ok', true);
end $$;

create or replace function public.rh_candidaturas_da_vaga(p_vaga uuid)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); r json;
begin
  if not public.is_equipe() or not exists (select 1 from public.rh_vagas where id = p_vaga and escritorio_id = esc) then raise exception 'Acesso negado.'; end if;
  select coalesce(json_agg(c order by c.criado_em desc), '[]'::json) into r from (
    select id, nome, email, whatsapp, cidade, uf, linkedin, curriculo_path, respostas, banco_talentos, etapa, nota, obs, criado_em
      from public.rh_candidaturas where vaga_id = p_vaga) c;
  return r;
end $$;

create or replace function public.rh_candidatura_atualizar(p_id uuid, p_etapa text, p_nota int, p_obs text)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); nm text; atual text; banco boolean;
begin
  if not public.sou_admin() then return json_build_object('ok', false, 'erro', 'Só o gestor move candidatos.'); end if;
  if p_etapa is not null and p_etapa not in ('recebido','triagem','teste','entrevista','proposta','contratado','banco','nao_seguiu') then return json_build_object('ok', false, 'erro', 'Etapa inválida.'); end if;
  if p_nota is not null and (p_nota < 1 or p_nota > 5) then return json_build_object('ok', false, 'erro', 'A nota vai de 1 a 5.'); end if;
  select nome, etapa, banco_talentos into nm, atual, banco from public.rh_candidaturas where id = p_id and escritorio_id = esc;
  if nm is null then return json_build_object('ok', false, 'erro', 'Candidatura não encontrada.'); end if;
  if p_etapa = 'banco' and not banco then
    return json_build_object('ok', false, 'erro', 'Este candidato não aceitou ficar no banco de talentos.'); end if;
  update public.rh_candidaturas set etapa = coalesce(p_etapa, etapa), nota = coalesce(p_nota, nota),
    obs = case when p_obs is null then obs else left(nullif(btrim(p_obs),''), 1000) end, atualizado_em = now(),
    apagar_em = case when coalesce(p_etapa, etapa) = 'banco' then current_date + 365 else apagar_em end
  where id = p_id;
  if p_etapa is not null and p_etapa <> atual then perform public.auditar('recrutamento', nm || ': ' || atual || ' → ' || p_etapa, p_id::text); end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.rh_candidatura_apagar(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare esc uuid := public.meu_escritorio(); nm text;
begin
  if not public.sou_admin() then return json_build_object('ok', false, 'erro', 'Só o gestor pode apagar.'); end if;
  delete from public.rh_candidaturas where id = p_id and escritorio_id = esc returning nome into nm;
  if nm is null then return json_build_object('ok', false, 'erro', 'Candidatura não encontrada.'); end if;
  perform public.auditar('recrutamento', 'candidatura apagada a pedido (LGPD)', p_id::text);
  return json_build_object('ok', true);
end $$;

-- ===== Público (sem login) =====
create or replace function public.rh_vaga_publica(p_escritorio text, p_vaga text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', v.id, 'escritorio', e.nome, 'cidade_escritorio', e.cidade, 'funcao', v.funcao, 'titulo', v.titulo,
    'regime', v.regime, 'modalidade', v.modalidade, 'jornada', v.jornada, 'cidade', v.cidade,
    'salario', case when v.mostrar_salario then v.salario end, 'salario_obs', case when v.mostrar_salario then v.salario_obs end,
    'beneficios', v.beneficios, 'atividades', v.atividades, 'requisitos', v.requisitos, 'diferenciais', v.diferenciais,
    'perguntas', v.perguntas, 'quantidade', v.quantidade, 'inscricoes_ate', v.inscricoes_ate,
    'aberta', v.status = 'aberta' and (v.inscricoes_ate is null or v.inscricoes_ate >= current_date))
  from public.rh_vagas v join public.escritorios e on e.id = v.escritorio_id
  where e.slug = lower(p_escritorio) and v.slug = lower(p_vaga) and v.status in ('aberta','pausada','encerrada');
$$;

create or replace function public.rh_candidatura_enviar(p jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare v public.rh_vagas; nm text := btrim(coalesce(p->>'nome','')); em text := lower(btrim(coalesce(p->>'email','')));
        wa text := regexp_replace(coalesce(p->>'whatsapp',''), '\D', '', 'g'); li text := nullif(btrim(coalesce(p->>'linkedin','')), '');
        cv text := nullif(p->>'curriculo_path',''); resp jsonb := coalesce(p->'respostas', '{}'::jsonb);
begin
  begin select * into v from public.rh_vagas where id = nullif(p->>'vaga','')::uuid; exception when others then v := null; end;
  if v.id is null or v.status <> 'aberta' or (v.inscricoes_ate is not null and v.inscricoes_ate < current_date) then
    return json_build_object('ok', false, 'erro', 'Esta vaga não está recebendo inscrições.'); end if;
  if coalesce((p->>'consentimento')::boolean, false) is not true then return json_build_object('ok', false, 'erro', 'É preciso aceitar o uso dos dados para participar.'); end if;
  if length(nm) < 5 or length(nm) > 120 or position(' ' in nm) = 0 then return json_build_object('ok', false, 'erro', 'Informe o nome completo.'); end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 160 then return json_build_object('ok', false, 'erro', 'E-mail inválido.'); end if;
  if length(wa) < 10 or length(wa) > 13 then return json_build_object('ok', false, 'erro', 'WhatsApp inválido. Use DDD e número.'); end if;
  if li is not null and (li !~* '^https?://([a-z]+\.)?linkedin\.com/' or length(li) > 200) then return json_build_object('ok', false, 'erro', 'O LinkedIn precisa ser um endereço linkedin.com.'); end if;
  if cv is not null and (cv !~ ('^' || v.id::text || '/[0-9a-f-]{36}\.pdf$')) then return json_build_object('ok', false, 'erro', 'Currículo inválido.'); end if;
  if jsonb_typeof(resp) <> 'object' or length(resp::text) > 8000 then return json_build_object('ok', false, 'erro', 'Respostas longas demais.'); end if;
  if exists (select 1 from public.rh_candidaturas where vaga_id = v.id and email = em) then
    return json_build_object('ok', false, 'erro', 'Já recebemos uma inscrição com este e-mail para esta vaga.'); end if;
  if (select count(*) from public.rh_candidaturas where vaga_id = v.id and criado_em > now() - interval '1 hour') >= 200 then
    return json_build_object('ok', false, 'erro', 'Muitas inscrições agora. Tente de novo em alguns minutos.'); end if;
  insert into public.rh_candidaturas (vaga_id, escritorio_id, nome, email, whatsapp, cidade, uf, linkedin, curriculo_path, respostas, consentimento_em, banco_talentos)
  values (v.id, v.escritorio_id, nm, em, wa, left(nullif(btrim(p->>'cidade'),''),80), upper(left(nullif(btrim(p->>'uf'),''),2)), li, cv, resp, now(), coalesce((p->>'banco_talentos')::boolean, false));
  return json_build_object('ok', true);
end $$;

-- Limpeza do prazo de guarda (chamada por agendamento ou manualmente pelo Coder)
create or replace function public.rh_limpar_vencidas()
returns int language sql security definer set search_path = public as $$
  with d as (delete from public.rh_candidaturas where apagar_em < current_date and etapa not in ('contratado') returning 1) select count(*)::int from d;
$$;

revoke all on function public.rh_vaga_lista(), public.rh_vaga_salvar(jsonb), public.rh_vaga_status(uuid,text), public.rh_candidaturas_da_vaga(uuid),
  public.rh_candidatura_atualizar(uuid,text,int,text), public.rh_candidatura_apagar(uuid), public.rh_limpar_vencidas() from anon, public;
grant execute on function public.rh_vaga_lista(), public.rh_vaga_salvar(jsonb), public.rh_vaga_status(uuid,text), public.rh_candidaturas_da_vaga(uuid),
  public.rh_candidatura_atualizar(uuid,text,int,text), public.rh_candidatura_apagar(uuid) to authenticated;
grant execute on function public.rh_vaga_publica(text,text), public.rh_candidatura_enviar(jsonb) to anon, authenticated;

-- ===== Currículos: bucket privado; o candidato só envia PDF até 5 MB; só a equipe da vaga lê =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('curriculos', 'curriculos', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];

-- As políticas usam funções próprias porque quem envia (anon) não lê a tabela de vagas.
create or replace function public.rh_vaga_aberta_txt(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.rh_vagas v where v.id::text = p and v.status = 'aberta');
$$;
create or replace function public.rh_vaga_minha_txt(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_equipe() and exists (select 1 from public.rh_vagas v where v.id::text = p and v.escritorio_id = public.meu_escritorio());
$$;
grant execute on function public.rh_vaga_aberta_txt(text) to anon, authenticated;
grant execute on function public.rh_vaga_minha_txt(text) to authenticated;

drop policy if exists "curriculos envio" on storage.objects;
create policy "curriculos envio" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'curriculos' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$' and public.rh_vaga_aberta_txt((storage.foldername(name))[1]));
drop policy if exists "curriculos leitura" on storage.objects;
create policy "curriculos leitura" on storage.objects for select to authenticated
  using (bucket_id = 'curriculos' and public.rh_vaga_minha_txt((storage.foldername(name))[1]));
