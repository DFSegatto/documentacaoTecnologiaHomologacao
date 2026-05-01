-- Função pública que verifica se um e-mail está cadastrado em perfis_usuario.
-- Usa SECURITY DEFINER para executar como o owner (bypassa RLS),
-- mas só retorna um booleano — não expõe dados do perfil.
create or replace function public.email_cadastrado(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from perfis_usuario where email = lower(trim(p_email))
  );
$$;

-- Permite que usuários não autenticados (anon) chamem a função
grant execute on function public.email_cadastrado(text) to anon;
