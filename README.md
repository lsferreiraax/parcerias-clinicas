# 🏥 Parcerias Clínicas — Sistema de Rateio

Sistema web para controle de rateio financeiro entre profissionais de saúde em parcerias clínicas.

## Stack

| Camada       | Tecnologia               |
|--------------|--------------------------|
| Frontend     | React + TypeScript + Vite |
| Estilo       | Tailwind CSS             |
| Backend/DB   | Supabase (PostgreSQL)    |
| API          | Supabase Edge Functions  |
| Deploy       | Vercel                   |
| CI/CD        | GitHub Actions           |

## Parcerias configuradas

| Parceria | Camta | Médico | Psi1 | Psi2 |
|----------|-------|--------|------|------|
| A        | 20%   | —      | 30%  | 50%  |
| B        | —     | 10%    | 40%  | 50%  |
| C        | —     | —      | 40%  | 60%  |

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# edite .env com suas credenciais Supabase

# 3. Rodar banco (execute o SQL abaixo no Supabase SQL Editor)
# supabase/migrations/001_schema.sql

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

## Setup Supabase

1. Acesse seu projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor**
3. Cole e execute o conteúdo de `supabase/migrations/001_schema.sql`

## Deploy (Vercel)

### 1. Conecte o repositório na Vercel
- Acesse [vercel.com](https://vercel.com) → New Project → importe `parcerias-clinicas`

### 2. Configure as variáveis de ambiente na Vercel
```
VITE_SUPABASE_URL=https://nxahdyfrjrtwscolexdv.supabase.co
VITE_SUPABASE_ANON_KEY=<sua chave>
```

### 3. Configure os secrets no GitHub (para CI/CD automático)
Vá em **Settings → Secrets → Actions** e adicione:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

## Estrutura do projeto

```
src/
├── components/
│   ├── layout/      # Sidebar + Layout principal
│   └── ui/          # Badge, Card, Button, Modal, Input...
├── hooks/           # React Query hooks
├── lib/             # Supabase client + utils
├── pages/           # Dashboard, Lançamentos, Parcelas, Resumo
├── services/        # Lógica de negócio (rateio, CRUD)
└── types/           # Tipos TypeScript

supabase/
├── migrations/      # Schema SQL
└── functions/       # Edge Functions (rateio server-side)
```

## Fluxo de uso (Secretária)

1. **Novo atendimento** → aba Lançamentos → botão "Novo Lançamento"
2. Selecionar parceria (A, B ou C) e preencher valor → rateio calculado automaticamente
3. Para parcelados → parcelas geradas automaticamente na aba **Parcelas**
4. Baixar pagamentos → ícone ✓ em cada linha
5. **Resumo** → visão consolidada por parceria e profissional
