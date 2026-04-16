# 📚 Base de Conhecimento — Suporte

Sistema interno de documentação para times de suporte.
Stack: **Vite + React** · **Supabase** · **Vercel** · **TipTap** · **Tailwind CSS**

---

## ✅ Pré-requisitos

- Node.js 18+ → https://nodejs.org
- Conta Supabase (gratuita) → https://supabase.com
- Conta Vercel (gratuita) → https://vercel.com
- Repositório no GitHub

---

## 🚀 Passo a Passo

### 1. Configurar o Supabase

1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo de `supabase.sql` e clique em **Run**
4. Vá em **Authentication → Providers** e habilite **Email**
5. Para convidar membros: **Authentication → Users → Invite user**

**Credenciais** (Settings → API):
- Project URL
- anon public key

---

### 2. Rodar localmente

```bash
npm install
cp .env.example .env
# Preencha .env com as credenciais do Supabase
npm run dev
```

Acesse http://localhost:5173

---

### 3. Deploy na Vercel

```bash
# Push para o GitHub
git init
git add .
git commit -m "init"
git remote add origin https://github.com/seu-usuario/suporte-docs.git
git push -u origin main
```

1. Acesse https://vercel.com/new
2. Importe o repositório
3. Adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

> O arquivo `vercel.json` já está configurado para o roteamento SPA funcionar corretamente.

---

## 📁 Estrutura

```
suporte-docs/
├── src/
│   ├── lib/supabase.ts          → Cliente + tipos
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Editor.tsx           → Editor de texto rico
│   │   ├── UploadAnexos.tsx     → Upload de imagens/PDFs
│   │   ├── FormRegistro.tsx     → Formulário criar/editar
│   │   └── CategoriaBadge.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Home.tsx
│   │   ├── NovoRegistro.tsx
│   │   ├── VerRegistro.tsx
│   │   └── EditarRegistro.tsx
│   ├── App.tsx                  → Rotas e autenticação
│   ├── main.tsx
│   └── index.css
├── supabase.sql                 → SQL para configurar o banco
├── vercel.json                  → Configuração SPA para Vercel
└── .env.example
```

---

## ⚙️ Funcionalidades

- ✅ Login com e-mail/senha e link mágico
- ✅ Proteção de rotas (apenas equipe autenticada)
- ✅ Criar, visualizar, editar e excluir registros
- ✅ Editor de texto rico (negrito, listas, código, links, imagens)
- ✅ Upload de imagens e PDFs como anexos
- ✅ Categorias: Bug, Procedimento, Dúvida, Configuração, Outro
- ✅ Filtro por categoria e busca por título

---

## 🔧 Comandos

```bash
npm run dev      # http://localhost:5173
npm run build    # Gera dist/ para produção
npm run preview  # Visualiza o build localmente
```
