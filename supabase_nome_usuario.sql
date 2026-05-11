-- ============================================================
-- MIGRAÇÃO: Adiciona campo "nome" à tabela perfis_usuario
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona coluna nome (nullable para não quebrar registros existentes)
alter table perfis_usuario
  add column if not exists nome text;

-- 2. Preencha os nomes dos usuários existentes manualmente:
--    Substitua o user_id ou e-mail de cada pessoa e defina o nome real.
--    Exemplos:

-- update perfis_usuario set nome = 'Daniel Segatto'  where email = 'dnsegatto1@gmail.com';
-- update perfis_usuario set nome = 'João Silva'      where email = 'joao@empresa.com';
-- update perfis_usuario set nome = 'Maria Oliveira'  where email = 'maria@empresa.com';

-- 3. (Opcional) Para facilitar, liste todos os usuários cadastrados:
-- select user_id, email, nome, perfil from perfis_usuario order by email;
