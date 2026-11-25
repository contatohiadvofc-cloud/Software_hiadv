-- HiAdv 7 (25/11/2026): o Sênior passa a ter a IA própria do escritório (chave da Claude do escritório, em Integrações).
-- A Sara Integrada (IA do sistema, uso incluído) continua só no Sênior + Sara.
insert into public.plano_recursos (plano, recurso) values ('senior', 'ia') on conflict do nothing;
