-- ============================================================
-- Keep-alive v2 — Execute no SQL Editor do Supabase
-- ============================================================

-- Adiciona coluna para registrar se houve edição automática no log
alter table keepalive_log
  add column if not exists editou_registro boolean not null default false;

-- Remove coluna de e-mail do log (não usada mais)
-- alter table keepalive_log drop column if exists email_destino;
-- (Deixe comentado se quiser manter compatibilidade com dados anteriores)

-- Insere configurações padrão (não sobrescreve valores já existentes)
insert into configuracoes (chave, valor)
values
  ('keepalive_auto_editar',    'true'),
  ('keepalive_usuario_padrao', '')
on conflict (chave) do nothing;

-- Índice de performance para buscar o último registro
create index if not exists registros_atualizado_em_idx
  on registros(atualizado_em desc);
