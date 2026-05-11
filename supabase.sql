-- ============================================================
-- BASE DE CONHECIMENTO — Execute no SQL Editor do Supabase
-- Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ── Sessões ──────────────────────────────────────────────────
create table if not exists sessoes (
  id        uuid default gen_random_uuid() primary key,
  nome      text not null,
  descricao text not null default '',
  cor       text not null default '#4f46e5',
  parent_id uuid references sessoes(id) on delete set null,
  criado_em timestamptz default now()
);

create index if not exists sessoes_parent_idx on sessoes(parent_id);

create or replace function validar_profundidade_sessao()
returns trigger as $$
begin
  if new.parent_id is not null then
    if exists (
      select 1 from sessoes where id = new.parent_id and parent_id is not null
    ) then
      raise exception 'Não é possível criar sub-sessão de uma sub-sessão (máximo 2 níveis).';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger trigger_validar_sessao
  before insert or update on sessoes
  for each row execute function validar_profundidade_sessao();

-- ── Categorias ───────────────────────────────────────────────
create table if not exists categorias (
  id        uuid default gen_random_uuid() primary key,
  nome      text not null,
  cor       text not null default 'bg-gray-100 text-gray-700',
  criado_em timestamptz default now()
);

-- ── Registros ────────────────────────────────────────────────
create table if not exists registros (
  id            uuid default gen_random_uuid() primary key,
  titulo        text not null,
  conteudo      text not null default '',
  sessao_id     uuid references sessoes(id)    on delete set null,
  categoria_id  uuid references categorias(id) on delete set null,
  criado_por    uuid references auth.users(id) on delete set null,
  editado_por   uuid references auth.users(id) on delete set null,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists registros_sessao_idx    on registros(sessao_id);
create index if not exists registros_categoria_idx on registros(categoria_id);
create index if not exists registros_criado_em_idx on registros(criado_em desc);
create index if not exists registros_busca_idx on registros
  using gin(to_tsvector('portuguese', titulo || ' ' || regexp_replace(conteudo, '<[^>]*>', ' ', 'g')));

create or replace function atualizar_timestamp()
returns trigger as $$
begin new.atualizado_em = now(); return new; end;
$$ language plpgsql;

create or replace trigger trigger_atualizar_registro
  before update on registros
  for each row execute function atualizar_timestamp();

-- ── Histórico de edições ─────────────────────────────────────
create table if not exists registro_historico (
  id          uuid default gen_random_uuid() primary key,
  registro_id uuid references registros(id) on delete cascade not null,
  titulo      text not null,
  conteudo    text not null default '',
  editado_por uuid references auth.users(id) on delete set null,
  editado_em  timestamptz default now()
);

create index if not exists historico_registro_idx   on registro_historico(registro_id);
create index if not exists historico_editado_em_idx on registro_historico(editado_em desc);

-- ── Anexos ───────────────────────────────────────────────────
create table if not exists anexos (
  id          uuid default gen_random_uuid() primary key,
  registro_id uuid references registros(id) on delete cascade not null,
  nome        text not null,
  url         text not null,
  tipo        text not null check (tipo in ('imagem','pdf')),
  tamanho     bigint not null default 0,
  criado_em   timestamptz default now()
);

create index if not exists anexos_registro_idx on anexos(registro_id);

-- ── Credenciais ──────────────────────────────────────────────
create table if not exists credenciais (
  id            uuid default gen_random_uuid() primary key,
  registro_id   uuid references registros(id) on delete cascade not null,
  tipo          text not null default 'rdp'
                  check (tipo in ('rdp','vpn','ssh','ftp','http','outro')),
  label         text not null default '',
  host          text not null default '',
  porta         text not null default '',
  usuario       text not null default '',
  senha_cifrada text not null default '',   -- NUNCA texto claro — AES-256-GCM no cliente
  dominio       text not null default '',
  observacoes   text not null default '',
  ordem         int  not null default 0,
  criado_em     timestamptz default now()
);

create index if not exists credenciais_registro_idx on credenciais(registro_id);
create index if not exists credenciais_ordem_idx    on credenciais(registro_id, ordem);

-- ── Perfis de usuário ────────────────────────────────────────
create table if not exists perfis_usuario (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null unique,
  email         text not null,
  nome          text,
  perfil        text not null default 'usuario'
                  check (perfil in ('admin','suporte','usuario')),
  criado_em     timestamptz default now(),
  atualizado_em timestamptz,
  alterado_por  uuid references auth.users(id) on delete set null
);

-- ── Chamados ─────────────────────────────────────────────────
create table if not exists chamados (
  id            uuid default gen_random_uuid() primary key,
  titulo        text not null,
  descricao     text not null default '',
  tipo          text not null default 'bug'
                  check (tipo in ('bug','problema','sugestao','outro')),
  prioridade    text not null default 'media'
                  check (prioridade in ('baixa','media','alta','critica')),
  status        text not null default 'aberto'
                  check (status in ('aberto','em_andamento','resolvido','fechado')),
  criado_por    uuid references auth.users(id) on delete set null,
  responsavel   uuid references auth.users(id) on delete set null,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists chamados_criado_por_idx on chamados(criado_por);
create index if not exists chamados_status_idx     on chamados(status);
create index if not exists chamados_criado_em_idx  on chamados(criado_em desc);

create or replace trigger trigger_atualizar_chamado
  before update on chamados
  for each row execute function atualizar_timestamp();

create table if not exists chamados_comentarios (
  id         uuid default gen_random_uuid() primary key,
  chamado_id uuid references chamados(id) on delete cascade not null,
  conteudo   text not null,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em  timestamptz default now()
);

create index if not exists comentarios_chamado_idx on chamados_comentarios(chamado_id);

-- ── Avisos ───────────────────────────────────────────────────
create table if not exists avisos (
  id           uuid default gen_random_uuid() primary key,
  tipo         text not null default 'novidade'
                 check (tipo in ('novidade','melhoria','correcao','aviso')),
  titulo       text not null,
  descricao    text not null default '',
  versao       text,
  ativo        boolean not null default true,
  publicado_em timestamptz default now()
);

-- ── Configurações do sistema ──────────────────────────────────
create table if not exists configuracoes (
  chave     text primary key,
  valor     text not null,
  criado_em timestamptz default now()
);

-- ── Log de keep-alive ─────────────────────────────────────────
create table if not exists keepalive_log (
  id                 uuid default gen_random_uuid() primary key,
  verificado_em      timestamptz not null,
  ultima_atividade   timestamptz not null,
  dias_sem_movimento int not null,
  alerta_enviado     boolean not null default false,
  email_destino      text,
  criado_em          timestamptz default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table sessoes              enable row level security;
alter table categorias           enable row level security;
alter table registros            enable row level security;
alter table registro_historico   enable row level security;
alter table anexos               enable row level security;
alter table credenciais          enable row level security;
alter table perfis_usuario       enable row level security;
alter table chamados             enable row level security;
alter table chamados_comentarios enable row level security;
alter table avisos               enable row level security;
alter table configuracoes        enable row level security;
alter table keepalive_log        enable row level security;

-- Sessões
create policy "auth leem sessoes"    on sessoes for select to authenticated using (true);
create policy "auth criam sessoes"   on sessoes for insert to authenticated with check (true);
create policy "auth editam sessoes"  on sessoes for update to authenticated using (true);
create policy "auth excluem sessoes" on sessoes for delete to authenticated using (true);

-- Categorias
create policy "auth leem categorias"    on categorias for select to authenticated using (true);
create policy "auth criam categorias"   on categorias for insert to authenticated with check (true);
create policy "auth editam categorias"  on categorias for update to authenticated using (true);
create policy "auth excluem categorias" on categorias for delete to authenticated using (true);

-- Registros
create policy "auth leem registros"    on registros for select to authenticated using (true);
create policy "auth criam registros"   on registros for insert to authenticated with check (true);
create policy "auth editam registros"  on registros for update to authenticated using (true);
create policy "auth excluem registros" on registros for delete to authenticated using (true);

-- Histórico
create policy "auth leem historico"    on registro_historico for select to authenticated using (true);
create policy "auth criam historico"   on registro_historico for insert to authenticated with check (true);
create policy "auth excluem historico" on registro_historico for delete to authenticated using (true);

-- Anexos
create policy "auth leem anexos"    on anexos for select to authenticated using (true);
create policy "auth criam anexos"   on anexos for insert to authenticated with check (true);
create policy "auth excluem anexos" on anexos for delete to authenticated using (true);

-- Credenciais
create policy "auth leem credenciais"    on credenciais for select to authenticated using (true);
create policy "auth criam credenciais"   on credenciais for insert to authenticated with check (true);
create policy "auth excluem credenciais" on credenciais for delete to authenticated using (true);

-- Perfis
create policy "auth leem perfis"        on perfis_usuario for select to authenticated using (true);
create policy "auth criam perfis"       on perfis_usuario for insert to authenticated with check (auth.uid() = user_id);
create policy "service gerencia perfis" on perfis_usuario for all using (auth.role() = 'service_role');
create policy "admin atualiza perfis"   on perfis_usuario for update to authenticated
  using (exists (select 1 from perfis_usuario p where p.user_id = auth.uid() and p.perfil = 'admin'));

-- Chamados
create policy "auth leem chamados"      on chamados for select to authenticated using (true);
create policy "auth criam chamados"     on chamados for insert to authenticated with check (auth.uid() = criado_por);
create policy "auth atualizam chamados" on chamados for update to authenticated
  using (
    criado_por = auth.uid()
    or exists (select 1 from perfis_usuario p where p.user_id = auth.uid() and p.perfil in ('admin','suporte'))
  );
create policy "auth excluem chamados"   on chamados for delete to authenticated
  using (
    (criado_por = auth.uid() and status = 'aberto')
    or exists (select 1 from perfis_usuario p where p.user_id = auth.uid() and p.perfil = 'admin')
  );

-- Comentários
create policy "auth leem comentarios"    on chamados_comentarios for select to authenticated using (true);
create policy "auth criam comentarios"   on chamados_comentarios for insert to authenticated with check (auth.uid() = criado_por);
create policy "auth excluem comentarios" on chamados_comentarios for delete to authenticated
  using (
    criado_por = auth.uid()
    or exists (select 1 from perfis_usuario p where p.user_id = auth.uid() and p.perfil in ('admin','suporte'))
  );

-- Avisos
create policy "auth leem avisos"        on avisos for select to authenticated using (true);
create policy "service gerencia avisos" on avisos for all using (auth.role() = 'service_role');

-- Configurações
create policy "auth leem configuracoes"   on configuracoes for select to authenticated using (true);
create policy "auth criam configuracoes"  on configuracoes for insert to authenticated with check (true);
create policy "auth editam configuracoes" on configuracoes for update to authenticated using (true);

-- Keep-alive log
create policy "auth leem logs"    on keepalive_log for select to authenticated using (true);
create policy "service cria logs" on keepalive_log for insert with check (true);

-- ============================================================
-- Storage
-- ============================================================

insert into storage.buckets (id, name, public) values ('imagens',    'imagens',    true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', true) on conflict do nothing;

create policy "upload imagens"     on storage.objects for insert to authenticated with check (bucket_id = 'imagens');
create policy "ver imagens"        on storage.objects for select using (bucket_id = 'imagens');
create policy "excluir imagens"    on storage.objects for delete to authenticated using (bucket_id = 'imagens');
create policy "upload documentos"  on storage.objects for insert to authenticated with check (bucket_id = 'documentos');
create policy "ver documentos"     on storage.objects for select using (bucket_id = 'documentos');
create policy "excluir documentos" on storage.objects for delete to authenticated using (bucket_id = 'documentos');

-- ============================================================
-- Função auxiliar — contagens para sidebar
-- ============================================================

create or replace function public.contagens_sidebar_registros()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $fn$
  select jsonb_build_object(
    'sessoes',
    coalesce(
      (
        select jsonb_object_agg(k, to_jsonb(cnt))
        from (
          select coalesce(sessao_id::text, 'sem-sessao') as k, count(*)::int as cnt
          from registros
          group by sessao_id
        ) s
      ),
      '{}'::jsonb
    ),
    'categorias',
    coalesce(
      (
        select jsonb_object_agg(categoria_id::text, to_jsonb(cnt))
        from (
          select categoria_id, count(*)::int as cnt
          from registros
          where categoria_id is not null
          group by categoria_id
        ) c
      ),
      '{}'::jsonb
    )
  );
$fn$;

grant execute on function public.contagens_sidebar_registros() to authenticated;

-- ============================================================
-- Dados iniciais de exemplo
-- ============================================================

insert into sessoes (nome, descricao, cor) values
  ('Apontamento Web', 'Suporte ao módulo de apontamento de horas', '#4f46e5'),
  ('eDocs',           'Documentos eletrônicos e NF-e',            '#0891b2'),
  ('ERP',             'Sistema de gestão empresarial',            '#059669')
on conflict do nothing;

insert into categorias (nome, cor) values
  ('Bug / Erro',       'bg-red-100 text-red-700'),
  ('Procedimento',     'bg-blue-100 text-blue-700'),
  ('Dúvida Frequente', 'bg-yellow-100 text-yellow-700'),
  ('Configuração',     'bg-purple-100 text-purple-700'),
  ('Outro',            'bg-gray-100 text-gray-700')
on conflict do nothing;

-- Defina o primeiro admin substituindo o e-mail abaixo:
-- insert into perfis_usuario (user_id, email, perfil)
-- select id, email, 'admin' from auth.users where email = 'seu@email.com'
-- on conflict (user_id) do update set perfil = 'admin';
