-- ============================================================
-- ATUALIZAÇÃO: Sistema de Chamados (Bugs, Problemas, Sugestões)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de perfis/grupos de usuário
create table if not exists perfis_usuario (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  email       text not null,
  perfil      text not null default 'usuario'
                check (perfil in ('admin', 'suporte', 'usuario')),
  criado_em   timestamptz default now()
);

alter table perfis_usuario enable row level security;

create policy "auth leem perfis"    on perfis_usuario for select to authenticated using (true);
create policy "auth criam perfis"   on perfis_usuario for insert to authenticated with check (auth.uid() = user_id);
create policy "service gerencia perfis" on perfis_usuario for all using (auth.role() = 'service_role');
-- Admin pode atualizar perfis
create policy "admin atualiza perfis" on perfis_usuario for update to authenticated
  using (exists (select 1 from perfis_usuario p where p.user_id = auth.uid() and p.perfil = 'admin'));

-- 2. Tabela de chamados
create table if not exists chamados (
  id           uuid default gen_random_uuid() primary key,
  titulo       text not null,
  descricao    text not null default '',
  tipo         text not null default 'bug'
                 check (tipo in ('bug', 'problema', 'sugestao', 'outro')),
  prioridade   text not null default 'media'
                 check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  status       text not null default 'aberto'
                 check (status in ('aberto', 'em_andamento', 'resolvido', 'fechado')),
  criado_por   uuid references auth.users(id) on delete set null,
  responsavel  uuid references auth.users(id) on delete set null,
  criado_em    timestamptz default now(),
  atualizado_em timestamptz default now()
);

create index if not exists chamados_criado_por_idx  on chamados(criado_por);
create index if not exists chamados_status_idx      on chamados(status);
create index if not exists chamados_tipo_idx        on chamados(tipo);
create index if not exists chamados_criado_em_idx   on chamados(criado_em desc);

-- Trigger para atualizar timestamp
create or replace trigger trigger_atualizar_chamado
  before update on chamados
  for each row execute function atualizar_timestamp();

-- 3. Tabela de comentários dos chamados
create table if not exists chamados_comentarios (
  id          uuid default gen_random_uuid() primary key,
  chamado_id  uuid references chamados(id) on delete cascade not null,
  conteudo    text not null,
  criado_por  uuid references auth.users(id) on delete set null,
  criado_em   timestamptz default now()
);

create index if not exists comentarios_chamado_idx on chamados_comentarios(chamado_id);

-- 4. RLS — Chamados
alter table chamados enable row level security;

-- Qualquer autenticado vê chamados (aberto para todos lerem)
create policy "auth leem chamados" on chamados for select to authenticated using (true);

-- Qualquer autenticado pode criar chamado
create policy "auth criam chamados" on chamados for insert to authenticated
  with check (auth.uid() = criado_por);

-- Admin e suporte podem atualizar qualquer chamado; usuário só atualiza o próprio
create policy "auth atualizam chamados" on chamados for update to authenticated
  using (
    criado_por = auth.uid()
    or exists (
      select 1 from perfis_usuario p
      where p.user_id = auth.uid() and p.perfil in ('admin', 'suporte')
    )
  );

-- Admin pode excluir qualquer chamado; criador pode excluir o próprio (apenas se aberto)
create policy "auth excluem chamados" on chamados for delete to authenticated
  using (
    (criado_por = auth.uid() and status = 'aberto')
    or exists (
      select 1 from perfis_usuario p
      where p.user_id = auth.uid() and p.perfil = 'admin'
    )
  );

-- 5. RLS — Comentários
alter table chamados_comentarios enable row level security;

create policy "auth leem comentarios"  on chamados_comentarios for select to authenticated using (true);
create policy "auth criam comentarios" on chamados_comentarios for insert to authenticated
  with check (auth.uid() = criado_por);
create policy "auth excluem comentarios" on chamados_comentarios for delete to authenticated
  using (
    criado_por = auth.uid()
    or exists (
      select 1 from perfis_usuario p
      where p.user_id = auth.uid() and p.perfil in ('admin', 'suporte')
    )
  );

-- 6. Inserir perfil admin para o primeiro usuário (substitua pelo email correto)
-- insert into perfis_usuario (user_id, email, perfil)
-- select id, email, 'admin' from auth.users where email = 'dnsegatto1@gmail.com'
-- on conflict (user_id) do update set perfil = 'admin';
