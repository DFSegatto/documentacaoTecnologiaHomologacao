# Base de Conhecimento — Suporte

Sistema interno de documentação para times de suporte.
Stack: **Vite + React** · **Supabase** · **Vercel** · **TipTap** · **Tailwind CSS**

---

## Pré-requisitos

- Node.js 18+ → https://nodejs.org
- Conta Supabase (gratuita) → https://supabase.com
- Conta Vercel (gratuita) → https://vercel.com
- Repositório no GitHub

---

## Configuração

### 1. Supabase

1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo de `supabase.sql` e clique em **Run**
4. Em **Authentication → Providers**, habilite **Email**
5. Para convidar membros: **Authentication → Users → Invite user**
6. Defina o primeiro admin executando o comando comentado no final do `supabase.sql`

Em **Settings → API**, copie:
- Project URL → `VITE_SUPABASE_URL`
- anon public key → `VITE_SUPABASE_ANON_KEY`

### 2. Rodar localmente

```bash
npm install
cp .env.example .env
# Preencha .env com as credenciais do Supabase
npm run dev
```

Acesse http://localhost:5173

### 3. Deploy na Vercel

1. Faça push do repositório para o GitHub
2. Acesse https://vercel.com/new e importe o repositório
3. Adicione as variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

> O arquivo `vercel.json` já está configurado para o roteamento SPA funcionar corretamente.

---

## Estrutura

```
src/
├── lib/
│   ├── supabase.ts          → Cliente Supabase + tipos
│   ├── cripto.ts            → Criptografia AES-256-GCM (credenciais)
│   └── documentacaoSenior.ts → Links externos de documentação
├── components/
│   ├── Navbar.tsx
│   ├── Editor.tsx           → Editor de texto rico (TipTap)
│   ├── FormRegistro.tsx     → Formulário criar/editar registro
│   ├── FormCredencial.tsx   → Formulário de credenciais de acesso
│   ├── VisualizarCredencial.tsx
│   ├── UploadAnexos.tsx
│   ├── MuralAvisos.tsx
│   └── CategoriaBadge.tsx
├── pages/
│   ├── Login.tsx
│   ├── Home.tsx
│   ├── NovoRegistro.tsx
│   ├── VerRegistro.tsx
│   ├── EditarRegistro.tsx
│   ├── Historico.tsx
│   ├── RestaurarVersao.tsx
│   ├── Sessoes.tsx
│   ├── Categorias.tsx
│   ├── Chamados.tsx
│   ├── VerChamado.tsx
│   ├── GerenciarPerfis.tsx
│   ├── Configuracoes.tsx
│   ├── ReleaseNotes.tsx
│   └── RedefinirSenha.tsx
├── context/
│   ├── ThemeContext.tsx
│   └── NavigationGuardContext.tsx
├── hooks/
│   ├── usePerfil.ts
│   ├── useAvisosNovos.ts
│   └── useAlertaBanco.ts
├── App.tsx                  → Rotas e autenticação
├── main.tsx
└── index.css
supabase.sql                 → Schema completo do banco
supabase/functions/
└── keepalive-check/         → Edge Function de alerta de inatividade
vercel.json                  → Configuração SPA
```

---

## Funcionalidades

- Login com e-mail/senha e link mágico
- Proteção de rotas (apenas equipe autenticada)
- Criar, visualizar, editar e excluir registros
- Editor de texto rico (negrito, listas, código, links, imagens)
- Upload de imagens e PDFs como anexos
- Credenciais de acesso criptografadas (RDP, VPN, SSH, FTP, HTTP)
- Sessões e sub-sessões para organizar registros
- Categorias dinâmicas com cores
- Histórico de edições com restauração de versão
- Busca full-text no título e conteúdo
- Sistema de chamados (bug, problema, sugestão)
- Gerenciamento de perfis (admin, suporte, usuário)
- Mural de avisos/novidades
- Alerta por e-mail em caso de inatividade (keep-alive)
- Modo claro/escuro

---

## Comandos

```bash
npm run dev      # http://localhost:5173
npm run build    # Gera dist/ para produção
npm run preview  # Visualiza o build localmente
```
