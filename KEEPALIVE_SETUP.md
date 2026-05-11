# Keep-alive — Guia de Configuração

Este documento explica como ativar o sistema de alertas de inatividade do banco Supabase.

---

## Por que isso é necessário?

O Supabase pausa projetos no plano gratuito após **7 dias sem atividade**.
Este sistema verifica diariamente se o banco teve movimento e envia um e-mail de alerta
no **5º dia sem atividade**, dando tempo para agir antes da pausa.

---

## Passo 1 — Criar conta no Resend (envio de e-mail)

O Resend é um serviço gratuito de e-mail transacional.

1. Acesse https://resend.com e crie uma conta gratuita
2. Vá em **API Keys** → **Create API Key**
3. Dê um nome (ex: `suporte-docs-keepalive`) e copie a chave gerada
4. O plano gratuito permite 100 e-mails/dia e 3.000/mês — mais que suficiente

---

## Passo 2 — Instalar o CLI do Supabase

```bash
npm install -g supabase
```

Faça login:

```bash
supabase login
```

Link com seu projeto (pegue o ID em Dashboard → Settings → General):

```bash
supabase link --project-ref SEU_PROJECT_ID
```

---

## Passo 3 — Configurar variáveis da Edge Function

No painel do Supabase:
**Dashboard → Settings → Edge Functions → Add new secret**

Adicione estas duas variáveis:

| Nome             | Valor                                      |
|------------------|--------------------------------------------|
| `RESEND_API_KEY` | A chave copiada do Resend no Passo 1       |
| `SITE_URL`       | URL do seu site na Vercel (ex: https://suporte-docs.vercel.app) |

> As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente — não precisa adicionar.

---

## Passo 4 — Deploy da Edge Function

Na raiz do projeto:

```bash
supabase functions deploy keepalive-check --no-verify-jwt
```

O flag `--no-verify-jwt` permite que o cron chame a função sem token de usuário.

Para testar manualmente após o deploy:

```bash
curl -X POST https://SEU_PROJECT_ID.supabase.co/functions/v1/keepalive-check \
  -H "Authorization: Bearer SEU_ANON_KEY"
```

---

## Passo 5 — Ativar o cron diário

Execute este SQL no **SQL Editor** do Supabase para agendar a verificação todo dia às 9h (horário UTC):

```sql
-- Habilitar extensão de cron (já vem no Supabase)
select cron.schedule(
  'keepalive-check-diario',
  '0 9 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/keepalive-check',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

Para verificar se o cron foi criado:

```sql
select * from cron.job;
```

Para remover o cron (se necessário):

```sql
select cron.unschedule('keepalive-check-diario');
```

---

## Passo 6 — Executar o SQL de atualização do banco

No **SQL Editor** do Supabase, execute:

```sql
-- Tabela de configurações do sistema
create table if not exists configuracoes (
  chave     text primary key,
  valor     text not null,
  criado_em timestamptz default now()
);

alter table configuracoes enable row level security;
create policy "auth leem configuracoes"   on configuracoes for select to authenticated using (true);
create policy "auth editam configuracoes" on configuracoes for update to authenticated using (true);
create policy "auth criam configuracoes"  on configuracoes for insert to authenticated with check (true);

-- Tabela de log de verificações do keep-alive
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
create policy "auth leem logs"  on keepalive_log for select to authenticated using (true);
create policy "service cria logs" on keepalive_log for insert with check (true);
```

---

## Passo 7 — Cadastrar o e-mail no sistema

1. Acesse o site e vá em **Configurações** (ícone de engrenagem na navbar)
2. Digite o e-mail que deve receber os alertas
3. Clique em **Salvar e-mail**
4. Clique em **Testar agora** para confirmar que tudo está funcionando

---

## Verificação

Após configurar, o log de verificações na página de Configurações mostrará:

- ✅ **Normal** — banco com atividade recente
- 📧 **Alerta enviado** — e-mail disparado (banco com 5+ dias sem movimento)

---

## Solução de problemas

**E-mail não chega:**
- Verifique se a `RESEND_API_KEY` está correta no painel do Supabase
- Cheque a pasta de spam
- No plano gratuito do Resend, e-mails só podem ser enviados para o e-mail cadastrado na conta, a menos que você configure um domínio próprio

**Função não executa:**
- Verifique o deploy: `supabase functions list`
- Veja os logs: Dashboard → Edge Functions → keepalive-check → Logs

**Cron não dispara:**
- Confirme com: `select * from cron.job where jobname = 'keepalive-check-diario';`
- O horário é UTC — 9h UTC = 6h em Brasília (horário de verão) ou 6h no horário padrão
