-- HiAdv 24/11/2026: novos conectores com chave no cofre (Escavador, JUDIT, Clicksign, D4Sign, Asaas).
-- Aplicar primeiro no TESTE. Produção só com autorização do Felipe.
create or replace function public.hiadv_servicos_com_chave() returns text[] language sql immutable as
$$ select array['claude','zapsign','escavador','judit','clicksign','d4sign','asaas'] $$;

create or replace function public.integracao_chave_salvar(p_servico text, p_chave text)
 returns json language plpgsql security definer set search_path to 'public', 'vault' as $function$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_esc uuid := public.meu_escritorio();
  v_chave text := btrim(coalesce(p_chave, ''));
  v_seg uuid; v_nome text;
begin
  if public.meu_papel() is null or public.meu_papel() not in ('master', 'code') then return json_build_object('ok', false, 'erro', 'Só o Gestor Master cadastra chaves.'); end if;
  if not (p_servico = any (public.hiadv_servicos_com_chave())) then return json_build_object('ok', false, 'erro', 'Este serviço não usa chave.'); end if;
  if length(v_chave) < 20 or length(v_chave) > 600 or v_chave ~ '\s' then return json_build_object('ok', false, 'erro', 'A chave não parece válida.'); end if;
  if p_servico = 'claude' and v_chave !~ '^sk-ant-' then return json_build_object('ok', false, 'erro', 'A chave da Claude começa com sk-ant-.'); end if;
  v_nome := 'hiadv_' || p_servico || '_' || v_esc::text;
  select segredo_id into v_seg from public.escritorio_integracoes where escritorio_id = v_esc and servico = p_servico;
  if v_seg is null then v_seg := vault.create_secret(v_chave, v_nome, 'Chave ' || p_servico || ' do escritório ' || v_esc::text);
  else perform vault.update_secret(v_seg, v_chave); end if;
  insert into public.escritorio_integracoes (escritorio_id, servico, ativo, modo, segredo_id, chave_final, configurado_por, configurado_em)
  values (v_esc, p_servico, false, case when p_servico = 'zapsign' then 'um_clique' end, v_seg, right(v_chave, 4), v_email, now())
  on conflict (escritorio_id, servico) do update set segredo_id = v_seg, chave_final = right(v_chave, 4), configurado_por = v_email, configurado_em = now();
  insert into public.auditoria (quem, tipo, acao, alvo, escritorio_id) values (v_email, 'integracao', 'cadastrou chave', p_servico, v_esc);
  return json_build_object('ok', true, 'chave_final', right(v_chave, 4));
end $function$;

create or replace function public.integracao_salvar(p_servico text, p_ativo boolean, p_modo text default null, p_limite numeric default null)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_esc uuid := public.meu_escritorio();
  v_tem_chave boolean;
begin
  if public.meu_papel() is null or public.meu_papel() not in ('master', 'code') then return json_build_object('ok', false, 'erro', 'Só o Gestor Master altera integrações.'); end if;
  if not (p_servico = any (public.hiadv_servicos_com_chave() || array['google_drive'])) then return json_build_object('ok', false, 'erro', 'Serviço desconhecido.'); end if;
  if p_servico = 'zapsign' and p_modo is not null and p_modo not in ('um_clique', 'automatico') then return json_build_object('ok', false, 'erro', 'Modo inválido.'); end if;
  if p_limite is not null and (p_limite < 0 or p_limite > 100000) then return json_build_object('ok', false, 'erro', 'Limite fora do esperado.'); end if;
  select segredo_id is not null into v_tem_chave from public.escritorio_integracoes where escritorio_id = v_esc and servico = p_servico;
  if p_ativo and p_servico = any (public.hiadv_servicos_com_chave()) and not coalesce(v_tem_chave, false) then
    return json_build_object('ok', false, 'erro', 'Cadastre a chave antes de ativar.');
  end if;
  insert into public.escritorio_integracoes (escritorio_id, servico, ativo, modo, limite_mensal, configurado_por, configurado_em)
  values (v_esc, p_servico, p_ativo, case when p_servico = 'zapsign' then coalesce(p_modo, 'um_clique') else p_modo end, p_limite, v_email, now())
  on conflict (escritorio_id, servico) do update
    set ativo = excluded.ativo, modo = coalesce(excluded.modo, public.escritorio_integracoes.modo),
        limite_mensal = excluded.limite_mensal, configurado_por = v_email, configurado_em = now();
  insert into public.auditoria (quem, tipo, acao, alvo, escritorio_id)
  values (v_email, 'integracao', case when p_ativo then 'ativou' else 'desativou' end, p_servico, v_esc);
  return json_build_object('ok', true);
end $function$;

create or replace function public.integracoes_listar()
 returns json language sql stable security definer set search_path to 'public' as $function$
  select case when not public.is_equipe() then '[]'::json else coalesce((
    select json_agg(json_build_object(
      'servico', s.servico, 'ativo', coalesce(i.ativo, false), 'modo', i.modo, 'limite_mensal', i.limite_mensal,
      'tem_chave', i.segredo_id is not null, 'chave_final', i.chave_final, 'configurado_em', i.configurado_em,
      'configurado_por', i.configurado_por, 'extra', coalesce(i.extra, '{}'::jsonb)) order by s.ordem)
    from (values ('claude', 1), ('zapsign', 2), ('google_drive', 3), ('escavador', 4), ('judit', 5), ('clicksign', 6), ('d4sign', 7), ('asaas', 8)) s(servico, ordem)
    left join public.escritorio_integracoes i on i.servico = s.servico and i.escritorio_id = public.meu_escritorio()
  ), '[]'::json) end;
$function$;

-- Lista de serviços permitidos na tabela
do $$ declare c text; begin
  select conname into c from pg_constraint where conrelid='public.escritorio_integracoes'::regclass and contype='c' and pg_get_constraintdef(oid) like '%servico%';
  execute format('alter table public.escritorio_integracoes drop constraint %I', c);
end $$;
alter table public.escritorio_integracoes add constraint escritorio_integracoes_servico_check
  check (servico = any (array['claude','zapsign','google_drive','escavador','judit','clicksign','d4sign','asaas']));
