# Feature: Página de Configurações

## Visão Geral

Painel de configurações do sistema acessível apenas ao Admin, centralizando o gerenciamento de parcerias, profissionais, dados da clínica e preferências do sistema.

---

## Motivação

Atualmente as parcerias e profissionais são inseridos diretamente via SQL. Um Admin não-técnico não consegue alterar percentuais de rateio ou cadastrar novos profissionais sem acesso ao banco. Esta feature elimina essa dependência.

---

## Seções da Página

### 1. Dados da Clínica
- Nome da clínica (exibido nos PDFs e e-mails)
- Logo (upload de imagem, armazenada no Supabase Storage)
- E-mail de contato / e-mail de notificação (substitui `NOTIFY_EMAIL` hardcoded)
- Fuso horário

### 2. Gerenciamento de Parcerias
- Listagem das parcerias existentes (A, B, C…)
- Editar percentuais de rateio por parceria
- Criar nova parceria
- Desativar parceria (não exclui — preserva histórico)

**Regra:** a soma dos percentuais deve ser ≤ 100%. O sistema valida antes de salvar.

### 3. Gerenciamento de Profissionais
- Listagem com nome, tipo e status (ativo/inativo)
- Editar nome e tipo
- Ativar/desativar profissional
- Associar profissional a um usuário (`user_profiles.tipo_profissional`)

### 4. Configurações de Notificação
- Ativar/desativar notificação diária de parcelas vencidas
- Horário do disparo (campo de hora → atualiza o cron job)
- E-mail(s) destinatário(s) — suporte a múltiplos e-mails
- Botão "Testar agora" — dispara a Edge Function manualmente

### 5. Segurança
- Visualizar usuários ativos (atalho para a página Usuários)
- Histórico de logins recentes (últimos 10 — via `auth.audit_log_entries` do Supabase)

---

## Modelo de Dados

### Nova tabela: `configuracoes`

```sql
CREATE TABLE configuracoes (
  id                  INT PRIMARY KEY DEFAULT 1,  -- singleton
  nome_clinica        TEXT NOT NULL DEFAULT 'Parcerias Clínicas',
  logo_url            TEXT,
  email_notificacao   TEXT[],                      -- array de e-mails
  notificacao_ativa   BOOLEAN DEFAULT TRUE,
  horario_notificacao TIME DEFAULT '08:00',
  fuso_horario        TEXT DEFAULT 'America/Sao_Paulo',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Garante apenas uma linha
ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_singleton CHECK (id = 1);

INSERT INTO configuracoes DEFAULT VALUES;

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_read_auth"   ON configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_write_admin" ON configuracoes FOR UPDATE TO authenticated USING (get_my_role() = 'admin');
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Configuracoes.tsx` | Nova página com abas |
| `src/components/config/DadosClinica.tsx` | Novo — formulário de dados básicos |
| `src/components/config/GerenciarParcerias.tsx` | Novo — CRUD de parcerias |
| `src/components/config/GerenciarProfissionais.tsx` | Novo — CRUD de profissionais |
| `src/components/config/ConfigNotificacao.tsx` | Novo — configuração de e-mail e cron |
| `src/services/configuracoes.ts` | Novo — queries na tabela configuracoes |
| `src/main.tsx` | Adicionar rota `/configuracoes` (Admin only) |
| `src/components/layout/Layout.tsx` | Adicionar item Configurações no nav |
| `supabase/migrations/005_configuracoes.sql` | Nova migration |
| `docs/scripts-banco-de-dados.md` | Documentar migration 005 |

---

## Critérios de Aceite

- [ ] Admin consegue editar nome da clínica e percentuais de parceria sem tocar no banco
- [ ] Validação impede percentuais negativos ou soma > 100%
- [ ] Upload de logo armazenado no Supabase Storage e exibido nos PDFs
- [ ] Configuração de e-mail reflete nas notificações diárias
- [ ] Botão "Testar agora" dispara e-mail de teste com sucesso
- [ ] Página inacessível para Gestor e Profissional (RoleGuard)

---

## Status

- [x] Documentação criada
- [x] Migration `005_configuracoes.sql`
- [x] Página e componentes de configuração (DadosClinica, Parcerias, Profissionais)
- [ ] Integrar logo nos PDFs (aguarda feature-relatorios-pdf)
- [ ] Edge Function `notificar-vencidas` ler e-mails da tabela `configuracoes`
- [ ] Rodar migration no Supabase (SQL Editor)
- [ ] Testes e deploy
