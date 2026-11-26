-- HiAdv 22 (26/11/2026): o gestor exporta todos os dados do próprio escritório, a qualquer momento.
-- Só lê o escritório de quem pede; colunas de segurança (hash, senha, token, PIN, chave) ficam de fora. Cada exportação é registrada.
create or replace function public.hiadv_exportar(p_tabela text, p_pagina int default 0)
returns json language plpgsql security definer set search_path = public as $$
declare
  esc uuid := public.meu_escritorio();
  permitidas text[] := array['clientes','casos','casos_historico','processos','movimentacoes','tarefas','pericias','audiencias','pendencias',
    'documentos','honorarios','fin_lancamentos','horas','leads','contatos','notas','registros','cliente_atualizacoes','indicacoes','compras','reunioes','biblioteca','auditoria'];
  cols text; r json; tam int := 2000;
begin
  if not public.hiadv_sou_gestor() or esc is null then raise exception 'Somente os gestores do escritório podem exportar.'; end if;
  if p_tabela is null or not (p_tabela = any(permitidas)) then raise exception 'Tabela inválida.'; end if;
  if coalesce(p_pagina, 0) < 0 or p_pagina > 500 then raise exception 'Página inválida.'; end if;
  if not public.limitar('exportar', 2000, interval '1 hour') then raise exception 'Muitas exportações seguidas. Aguarde um pouco.'; end if;
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
    from information_schema.columns
   where table_schema = 'public' and table_name = p_tabela
     and column_name !~* '(hash|senha|token|pin$|^pin|segredo|chave|secret)';
  execute format('select coalesce(json_agg(t), ''[]''::json) from (select %s from public.%I where escritorio_id = $1 order by 1 limit %s offset $2) t', cols, p_tabela, tam)
    into r using esc, coalesce(p_pagina, 0) * tam;
  if p_tabela = 'clientes' and coalesce(p_pagina, 0) = 0 then
    insert into public.auditoria (quem, tipo, acao, alvo, escritorio_id) values (lower(auth.jwt() ->> 'email'), 'exportacao', 'exportou todos os dados do escritório', esc::text, esc);
  end if;
  return json_build_object('linhas', r, 'tamanho', tam);
end $$;
revoke all on function public.hiadv_exportar(text, int) from anon, public;
grant execute on function public.hiadv_exportar(text, int) to authenticated;
