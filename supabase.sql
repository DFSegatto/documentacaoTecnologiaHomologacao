-- ============================================================
-- BASE DE CONHECIMENTO — Execute no SQL Editor do Supabase
-- Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Sessões (agrupadores de registros por sistema/área)
create table if not exists sessoes (
  id        uuid default gen_random_uuid() primary key,
  nome      text not null,
  descricao text not null default '',
  cor       text not null default '#4f46e5',
  criado_em timestamptz default now()
);

-- Categorias dinâmicas
create table if not exists categorias (
  id        uuid default gen_random_uuid() primary key,
  nome      text not null,
  cor       text not null default 'bg-gray-100 text-gray-700',
  criado_em timestamptz default now()
);

-- Registros
create table if not exists registros (
  id            uuid default gen_random_uuid() primary key,
  titulo        text not null,
  conteudo      text not null default '',
  sessao_id     uuid references sessoes(id)    on delete set null,
  categoria_id  uuid references categorias(id) on delete set null,
  criado_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Anexos
create table if not exists anexos (
  id          uuid default gen_random_uuid() primary key,
  registro_id uuid references registros(id) on delete cascade not null,
  nome        text not null,
  url         text not null,
  tipo        text not null check (tipo in ('imagem','pdf')),
  tamanho     bigint not null default 0,
  criado_em   timestamptz default now()
);

-- Índices
create index if not exists registros_sessao_idx    on registros(sessao_id);
create index if not exists registros_categoria_idx on registros(categoria_id);
create index if not exists registros_criado_em_idx on registros(criado_em desc);
create index if not exists anexos_registro_idx     on anexos(registro_id);

-- Trigger atualizado_em
create or replace function atualizar_timestamp()
returns trigger as $$
begin new.atualizado_em = now(); return new; end;
$$ language plpgsql;

create or replace trigger trigger_atualizar_registro
  before update on registros
  for each row execute function atualizar_timestamp();

-- ============================================================
-- RLS
-- ============================================================
alter table sessoes    enable row level security;
alter table categorias enable row level security;
alter table registros  enable row level security;
alter table anexos     enable row level security;

create policy "auth leem sessoes"    on sessoes    for select to authenticated using (true);
create policy "auth criam sessoes"   on sessoes    for insert to authenticated with check (true);
create policy "auth editam sessoes"  on sessoes    for update to authenticated using (true);
create policy "auth excluem sessoes" on sessoes    for delete to authenticated using (true);

create policy "auth leem categorias"    on categorias for select to authenticated using (true);
create policy "auth criam categorias"   on categorias for insert to authenticated with check (true);
create policy "auth editam categorias"  on categorias for update to authenticated using (true);
create policy "auth excluem categorias" on categorias for delete to authenticated using (true);

create policy "auth leem registros"    on registros for select to authenticated using (true);
create policy "auth criam registros"   on registros for insert to authenticated with check (true);
create policy "auth editam registros"  on registros for update to authenticated using (true);
create policy "auth excluem registros" on registros for delete to authenticated using (true);

create policy "auth leem anexos"    on anexos for select to authenticated using (true);
create policy "auth criam anexos"   on anexos for insert to authenticated with check (true);
create policy "auth excluem anexos" on anexos for delete to authenticated using (true);

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
-- Dados iniciais de exemplo (remova se quiser partir do zero)
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


-- ============================================================
-- ATUALIZAÇÃO: Histórico de edições e busca no conteúdo
-- Execute este bloco se já tinha o banco configurado antes
-- ============================================================

-- Coluna editado_por nos registros
alter table registros add column if not exists editado_por uuid references auth.users(id) on delete set null;

-- Tabela de histórico de edições
create table if not exists registro_historico (
  id          uuid default gen_random_uuid() primary key,
  registro_id uuid references registros(id) on delete cascade not null,
  titulo      text not null,
  conteudo    text not null default '',
  editado_por uuid references auth.users(id) on delete set null,
  editado_em  timestamptz default now()
);

create index if not exists historico_registro_idx on registro_historico(registro_id);
create index if not exists historico_editado_em_idx on registro_historico(editado_em desc);

-- RLS para histórico
alter table registro_historico enable row level security;

create policy "auth leem historico"   on registro_historico for select to authenticated using (true);
create policy "auth criam historico"  on registro_historico for insert to authenticated with check (true);
create policy "auth excluem historico" on registro_historico for delete to authenticated using (true);

-- Índice de busca full-text no título e conteúdo (português)
-- Melhora muito a performance da busca em bases grandes
create index if not exists registros_busca_idx on registros
  using gin(to_tsvector('portuguese', titulo || ' ' || regexp_replace(conteudo, '<[^>]*>', ' ', 'g')));


-- ============================================================
-- ATUALIZAÇÃO: Keep-alive e configurações do sistema
-- Execute este bloco se já tinha o banco configurado antes
-- ============================================================

-- Tabela de configurações gerais do sistema
create table if not exists configuracoes (
  chave     text primary key,
  valor     text not null,
  criado_em timestamptz default now()
);

alter table configuracoes enable row level security;
create policy "auth leem configuracoes"   on configuracoes for select to authenticated using (true);
create policy "auth editam configuracoes" on configuracoes for update to authenticated using (true);
create policy "auth criam configuracoes"  on configuracoes for insert to authenticated with check (true);

-- Tabela de log das verificações automáticas de keep-alive
create table if not exists keepalive_log (
  id                 uuid default gen_random_uuid() primary key,
  verificado_em      timestamptz not null,
  ultima_atividade   timestamptz not null,
  dias_sem_movimento int not null,
  alerta_enviado     boolean not null default false,
  email_destino      text,
  criado_em          timestamptz default now()
);

alter table keepalive_log enable row level security;
create policy "auth leem logs"    on keepalive_log for select to authenticated using (true);
create policy "service cria logs" on keepalive_log for insert with check (true);

-- Cron diário às 9h UTC (execute após fazer deploy da Edge Function)
-- select cron.schedule(
--   'keepalive-check-diario',
--   '0 9 * * *',
--   $$
--   select net.http_post(
--     url     := current_setting('app.supabase_url') || '/functions/v1/keepalive-check',
--     headers := jsonb_build_object(
--       'Content-Type',  'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
--     ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );


-- ============================================================
-- ATUALIZAÇÃO: Sub-sessões (parent_id na tabela sessoes)
-- Execute este bloco se já tinha o banco configurado antes
-- ============================================================

-- Adiciona coluna de hierarquia (referência para sessão pai)
alter table sessoes
  add column if not exists parent_id uuid references sessoes(id) on delete set null;

-- Índice para buscar filhas rapidamente
create index if not exists sessoes_parent_idx on sessoes(parent_id);

-- Garante que sub-sessões não virem pais de outras sub-sessões (máx. 2 níveis)
-- A validação principal é feita no frontend, mas esta função ajuda como segurança extra
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


-- ============================================================
-- ATUALIZAÇÃO: Registros privados e credenciais criptografadas
-- Execute este bloco se já tinha o banco configurado antes
-- ============================================================

-- 1. Coluna privado na tabela registros
alter table registros add column if not exists privado boolean not null default false;

create index if not exists registros_privado_idx on registros(privado);

-- 2. Tabela de credenciais (senhas sempre cifradas — AES-256-GCM no cliente)
create table if not exists credenciais (
  id            uuid default gen_random_uuid() primary key,
  registro_id   uuid references registros(id) on delete cascade not null unique,
  tipo          text not null default 'rdp'
                  check (tipo in ('rdp','vpn','ssh','ftp','http','outro')),
  host          text not null default '',
  porta         text not null default '',
  usuario       text not null default '',
  senha_cifrada text not null default '',   -- NUNCA texto claro
  dominio       text not null default '',
  observacoes   text not null default '',
  criado_em     timestamptz default now()
);

create index if not exists credenciais_registro_idx on credenciais(registro_id);

-- 3. RLS para credenciais — só o criador do registro acessa
alter table credenciais enable row level security;

create policy "dono le credenciais"
  on credenciais for select
  to authenticated
  using (
    exists (
      select 1 from registros r
      where r.id = credenciais.registro_id
        and r.criado_por = auth.uid()
    )
  );

create policy "dono cria credenciais"
  on credenciais for insert
  to authenticated
  with check (
    exists (
      select 1 from registros r
      where r.id = credenciais.registro_id
        and r.criado_por = auth.uid()
    )
  );

create policy "dono atualiza credenciais"
  on credenciais for update
  to authenticated
  using (
    exists (
      select 1 from registros r
      where r.id = credenciais.registro_id
        and r.criado_por = auth.uid()
    )
  );

create policy "dono exclui credenciais"
  on credenciais for delete
  to authenticated
  using (
    exists (
      select 1 from registros r
      where r.id = credenciais.registro_id
        and r.criado_por = auth.uid()
    )
  );

-- 4. Atualizar políticas de registros para respeitar privacidade
-- Remove políticas antigas e recria com lógica de privado

drop policy if exists "autenticados leem registros"   on registros;
drop policy if exists "auth leem registros"           on registros;

-- Regra: registros públicos → qualquer autenticado lê
--        registros privados → só o criador lê
create policy "leitura de registros com privacidade"
  on registros for select
  to authenticated
  using (
    privado = false
    or criado_por = auth.uid()
  );

-- 5. Atualizar política de histórico para respeitar privacidade
drop policy if exists "auth leem historico" on registro_historico;

create policy "leitura de historico com privacidade"
  on registro_historico for select
  to authenticated
  using (
    exists (
      select 1 from registros r
      where r.id = registro_historico.registro_id
        and (r.privado = false or r.criado_por = auth.uid())
    )
  );

-- 6. Atualizar política de anexos para respeitar privacidade
drop policy if exists "autenticados leem anexos" on anexos;
drop policy if exists "auth leem anexos"         on anexos;

create policy "leitura de anexos com privacidade"
  on anexos for select
  to authenticated
  using (
    exists (
      select 1 from registros r
      where r.id = anexos.registro_id
        and (r.privado = false or r.criado_por = auth.uid())
    )
  );


-- ============================================================
-- ATUALIZAÇÃO: Mural de avisos
-- ============================================================

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

alter table avisos enable row level security;

-- Qualquer usuário autenticado pode ler
create policy "auth leem avisos" on avisos for select to authenticated using (true);
-- Apenas service role pode inserir/editar (via SQL direto no Supabase)
create policy "service gerencia avisos" on avisos for all using (auth.role() = 'service_role');

-- ── Avisos desta versão ──────────────────────────────────────────────────
insert into avisos (tipo, titulo, descricao, versao, publicado_em) values

('novidade',
 'Modo claro/escuro para o sistema',
 'O sistema agora possui um modo claro/escuro para melhorar a usabilidade. Você pode alternar entre os modos clicando no botão de alternância no canto superior direito, ao lado do seu nome de usuário na barra de navegação.',
 '1.7', now()),
 ('novidade',
 'Notas de versão Sênior',
 'Agora você pode ver as notas de versão Sênior no sistema. Clique no botão "Notas de versão Sênior" na barra de navegação para ver as notas de versão Sênior.',
 '1.7', now()),
 ('novidade',
 'Registros privados com credenciais criptografadas',
 'Crie registros privados visíveis apenas para você. Salve acessos RDP, VPN, SSH e FTP com senhas protegidas por AES-256-GCM — criptografadas no navegador antes de chegar ao banco.',
 '1.6', now()),
 ('novidade',
 'Mural de novidades na página inicial',
 'Veja comunicados de novidades, melhorias e correções ao abrir a documentação. Você pode dispensar avisos um a um ou marcar todos como lidos.',
 '1.9', now()),
 ('melhoria',
 'Alerta por e-mail quando não há atualizações',
 'Em Configurações, cadastre um e-mail para lembretes se o sistema ficar vários dias sem novas edições nos registros. A página mostra também o histórico das últimas verificações.',
 '1.9', now());

-- Bancos já existentes: rode no SQL Editor (uma vez) o mesmo conteúdo acima, por exemplo:
-- insert into avisos (tipo, titulo, descricao, versao, publicado_em) values
-- ('novidade','Mural de novidades na página inicial','Veja comunicados de novidades, melhorias e correções ao abrir a documentação. Você pode dispensar avisos um a um ou marcar todos como lidos.','1.9', now()),
-- ('melhoria','Alerta por e-mail quando não há atualizações','Em Configurações, cadastre um e-mail para lembretes se o sistema ficar vários dias sem novas edições nos registros. A página mostra também o histórico das últimas verificações.','1.9', now());

-- ============================================================
-- ATUALIZAÇÃO: Múltiplas credenciais por registro
-- Execute se já tinha a tabela credenciais criada antes
-- ============================================================

-- Remove a restrição unique que impedia múltiplas credenciais
alter table credenciais drop constraint if exists credenciais_registro_id_key;

-- Adiciona campos novos
alter table credenciais add column if not exists label  text not null default '';
alter table credenciais add column if not exists ordem  int  not null default 0;

-- Índice de ordenação
create index if not exists credenciais_ordem_idx on credenciais(registro_id, ordem);

-- Se a tabela ainda não existia, crie do zero com a estrutura completa:
-- (ignore se já existia e rodou os comandos acima)
create table if not exists credenciais (
  id            uuid default gen_random_uuid() primary key,
  registro_id   uuid references registros(id) on delete cascade not null,
  tipo          text not null default 'rdp'
                  check (tipo in ('rdp','vpn','ssh','ftp','http','outro')),
  label         text not null default '',
  host          text not null default '',
  porta         text not null default '',
  usuario       text not null default '',
  senha_cifrada text not null default '',
  dominio       text not null default '',
  observacoes   text not null default '',
  ordem         int  not null default 0,
  criado_em     timestamptz default now()
);

alter table credenciais enable row level security;

create policy "dono le credenciais" on credenciais for select to authenticated
  using (exists (select 1 from registros r where r.id = credenciais.registro_id and r.criado_por = auth.uid()));

create policy "dono cria credenciais" on credenciais for insert to authenticated
  with check (exists (select 1 from registros r where r.id = credenciais.registro_id and r.criado_por = auth.uid()));

create policy "dono exclui credenciais" on credenciais for delete to authenticated
  using (exists (select 1 from registros r where r.id = credenciais.registro_id and r.criado_por = auth.uid()));
