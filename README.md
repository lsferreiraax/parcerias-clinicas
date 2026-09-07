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

## Telas do sistema

| Rota           | Descrição                                      | Roles            |
|----------------|------------------------------------------------|------------------|
| `/`            | Dashboard com KPIs e gráficos                  | admin, gestor    |
| `/lancamentos` | CRUD de atendimentos com cálculo de rateio     | admin, gestor    |
| `/parcelas`    | Baixa de parcelas de pagamento                 | admin, gestor    |
| `/resumo`      | Consolidado financeiro por parceria            | admin, gestor    |
| `/extrato`     | Visão do profissional sobre seus atendimentos  | todos            |
| `/repasses`    | Controle de repasses financeiros por profissional | admin, gestor |
| `/relatorios`  | Geração de PDF e Excel                         | admin, gestor    |
| `/usuarios`    | Gerenciamento de usuários                      | admin            |
| `/configuracoes` | Configuração das parcerias                   | admin            |

## Estrutura do projeto

```
src/
├── components/
│   ├── layout/      # Sidebar + Layout principal
│   └── ui/          # Badge, Card, Button, Modal, FiltroData...
├── hooks/           # React Query hooks (por feature)
├── lib/             # Supabase client + utils
├── pages/           # Uma página por rota
├── services/        # Lógica de negócio (rateio, repasses, CRUD)
└── types/           # Tipos TypeScript globais

supabase/
├── migrations/      # Schema SQL (001 a 011)
└── functions/       # Edge Functions

docs/
├── historico-features.md      # Histórico de todas as features implementadas
└── scripts-banco-de-dados.md  # Todas as migrations e scripts SQL com explicação
```

## Fluxo de uso

### Secretária
1. **Novo atendimento** → Lançamentos → "Novo Lançamento"
2. Selecionar parceria e preencher valor → rateio calculado automaticamente
3. Registrar meio de pagamento (Cartão, Pix, Dinheiro) e data de pagamento
4. Para parcelados → parcelas geradas automaticamente na aba **Parcelas**
5. **Resumo** → visão consolidada por parceria e profissional

### Gestor/Admin
1. **Repasses** → acompanhar e conciliar os repasses por profissional
2. **Relatórios** → gerar PDF ou Excel para prestação de contas
3. Exclusão de lançamentos em lote (com motivo obrigatório + auditoria)

## Documentação

- [Histórico de features](docs/historico-features.md)
- [Scripts e migrations de banco](docs/scripts-banco-de-dados.md)
