# Scripts — Banco de Dados

Documentação de todas as migrations e scripts SQL do projeto Parcerias Clínicas, executados no Supabase (SQL Editor ou via CLI).

---

## 001 — Schema Inicial

**Arquivo:** `supabase/migrations/001_schema.sql`  
**Quando rodar:** Primeira vez que subir o projeto em um novo projeto Supabase.

Cria as tabelas base, insere os dados iniciais de parcerias e profissionais, cria as views de resumo e habilita RLS com políticas de acesso para usuários autenticados.

### Tabelas criadas
| Tabela | Descrição |
|--------|-----------|
| `parcerias` | Tipos de parceria (A, B, C) com percentuais de rateio |
| `profissionais` | Profissionais cadastrados (camta, medico, psi1, psi2) |
| `lancamentos` | Atendimentos registrados com rateio automático |
| `parcelas` | Parcelas de atendimentos parcelados |

### Views criadas
| View | Descrição |
|------|-----------|
| `resumo_por_parceria` | Totais agrupados por parceria |
| `resumo_profissional` | Totais agrupados por profissional |

```sql
-- ─────────────────────────────────────────────
-- PARCERIAS CLÍNICAS — Schema inicial
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parcerias (
  id          TEXT PRIMARY KEY,
  descricao   TEXT NOT NULL,
  camta_pct   NUMERIC(5,2) DEFAULT 0,
  medico_pct  NUMERIC(5,2) DEFAULT 0,
  psi1_pct    NUMERIC(5,2) DEFAULT 0,
  psi2_pct    NUMERIC(5,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO parcerias VALUES
  ('A', 'Camta + Psi1 + Psi2', 20, 0,  30, 50),
  ('B', 'Médico + Psi1 + Psi2', 0, 10, 40, 50),
  ('C', 'Psi1 + Psi2',          0, 0,  40, 60)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS profissionais (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('camta','medico','psi1','psi2')),
  ativo      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO profissionais (nome, tipo) VALUES
  ('Camta',   'camta'),
  ('Médico',  'medico'),
  ('Psi1',    'psi1'),
  ('Psi2',    'psi2')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS lancamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_atendimento DATE NOT NULL,
  paciente         TEXT NOT NULL,
  parceria_id      TEXT NOT NULL REFERENCES parcerias(id),
  forma_pagamento  TEXT NOT NULL CHECK (forma_pagamento IN ('avista','parcelado')),
  num_parcelas     INT NOT NULL DEFAULT 1,
  valor_total      NUMERIC(10,2) NOT NULL,
  camta_valor      NUMERIC(10,2) DEFAULT 0,
  medico_valor     NUMERIC(10,2) DEFAULT 0,
  psi1_valor       NUMERIC(10,2) DEFAULT 0,
  psi2_valor       NUMERIC(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcelas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id    UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  parcela_num      INT NOT NULL,
  parcela_total    INT NOT NULL,
  data_vencimento  DATE NOT NULL,
  data_pagamento   DATE,
  valor_parcela    NUMERIC(10,2) NOT NULL,
  camta_valor      NUMERIC(10,2) DEFAULT 0,
  medico_valor     NUMERIC(10,2) DEFAULT 0,
  psi1_valor       NUMERIC(10,2) DEFAULT 0,
  psi2_valor       NUMERIC(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido')),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW resumo_por_parceria AS
SELECT
  p.id            AS parceria,
  p.descricao,
  COUNT(DISTINCT l.id)              AS total_atendimentos,
  COALESCE(SUM(l.valor_total),0)    AS valor_total,
  COALESCE(SUM(l.camta_valor),0)  + COALESCE(SUM(pa.camta_valor),0)   AS camta_total,
  COALESCE(SUM(l.medico_valor),0) + COALESCE(SUM(pa.medico_valor),0)  AS medico_total,
  COALESCE(SUM(l.psi1_valor),0)   + COALESCE(SUM(pa.psi1_valor),0)   AS psi1_total,
  COALESCE(SUM(l.psi2_valor),0)   + COALESCE(SUM(pa.psi2_valor),0)   AS psi2_total
FROM parcerias p
LEFT JOIN lancamentos l ON l.parceria_id = p.id
LEFT JOIN parcelas pa   ON pa.lancamento_id = l.id
GROUP BY p.id, p.descricao
ORDER BY p.id;

CREATE OR REPLACE VIEW resumo_profissional AS
SELECT 'camta' AS profissional,
  COALESCE(SUM(l.camta_valor),0) + COALESCE(SUM(pa.camta_valor),0) AS total
FROM lancamentos l LEFT JOIN parcelas pa ON pa.lancamento_id = l.id
UNION ALL
SELECT 'medico',
  COALESCE(SUM(l.medico_valor),0) + COALESCE(SUM(pa.medico_valor),0)
FROM lancamentos l LEFT JOIN parcelas pa ON pa.lancamento_id = l.id
UNION ALL
SELECT 'psi1',
  COALESCE(SUM(l.psi1_valor),0) + COALESCE(SUM(pa.psi1_valor),0)
FROM lancamentos l LEFT JOIN parcelas pa ON pa.lancamento_id = l.id
UNION ALL
SELECT 'psi2',
  COALESCE(SUM(l.psi2_valor),0) + COALESCE(SUM(pa.psi2_valor),0)
FROM lancamentos l LEFT JOIN parcelas pa ON pa.lancamento_id = l.id;

ALTER TABLE lancamentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcerias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_lancamentos"    ON lancamentos   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_parcelas"       ON parcelas      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_parcerias"     ON parcerias     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_profissionais" ON profissionais FOR SELECT TO authenticated USING (true);
```

---

## 002 — Agendamento de Notificação de Parcelas Vencidas

**Arquivo:** `supabase/migrations/002_cron_notificar_vencidas.sql`  
**Quando rodar:** Após habilitar as extensões `pg_cron` e `pg_net` em `Database → Extensions`.  
**Pré-requisito:** Edge Function `notificar-vencidas` já deployada.

Agenda a Edge Function para disparar automaticamente todo dia às **08:00 BRT** (11:00 UTC).

```sql
SELECT cron.schedule(
  'notificar-parcelas-vencidas',
  '0 11 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/notificar-vencidas',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    )
  $$
);
```

---

## 003 — Perfis de Acesso (RBAC)

**Arquivo:** `supabase/migrations/003_user_profiles.sql`  
**Quando rodar:** Após a migration 001.

Cria a tabela `user_profiles` com roles (admin, gestor, profissional), trigger de `updated_at`, RLS granular por perfil e restringe o `DELETE` em `lancamentos` apenas para Admin.

> **⚠️ Importante — RLS e recursão:** As políticas de admin usam uma função `get_my_role()` com `SECURITY DEFINER` para evitar recursão infinita. Sem ela, a policy de admin consultaria `user_profiles` para verificar o role, acionando a própria policy novamente e bloqueando a query.

**⚠️ Após rodar esta migration**, crie manualmente o primeiro usuário Admin:

```sql
INSERT INTO user_profiles (id, nome, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'SEU-EMAIL@exemplo.com';
```

```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('admin', 'gestor', 'profissional')),
  tipo_profissional TEXT CHECK (tipo_profissional IN ('camta', 'medico', 'psi1', 'psi2')),
  ativo             BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Função auxiliar sem recursão (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfil_select_proprio"
  ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "perfil_select_admin"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

CREATE POLICY "perfil_write_admin"
  ON user_profiles FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

DROP POLICY IF EXISTS "auth_all_lancamentos" ON lancamentos;

CREATE POLICY "lancamentos_read_write"   ON lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "lancamentos_insert_update" ON lancamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lancamentos_update_patch" ON lancamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "lancamentos_delete_admin"
  ON lancamentos FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );
```

---

## 004 — Gestão Avançada de Parcelas (Audit Log + Renegociação)

**Arquivo:** `supabase/migrations/004_parcelas_log.sql`  
**Quando rodar:** Após a migration 003.

Adiciona o status `'renegociada'` à constraint da tabela `parcelas`, cria a tabela `parcelas_log` para audit log e instala o trigger que registra automaticamente alterações de `status` e `data_vencimento`.

```sql
-- Adiciona status 'renegociada' ao CHECK
ALTER TABLE parcelas DROP CONSTRAINT IF EXISTS parcelas_status_check;
ALTER TABLE parcelas ADD CONSTRAINT parcelas_status_check
  CHECK (status IN ('pendente','pago','vencido','renegociada'));

-- Tabela de audit log
CREATE TABLE IF NOT EXISTS parcelas_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcela_id     UUID NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo     TEXT,
  alterado_por   UUID REFERENCES auth.users(id),
  alterado_em    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE parcelas_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_read_admin_gestor" ON parcelas_log
  FOR SELECT TO authenticated USING (get_my_role() IN ('admin', 'gestor'));
CREATE POLICY "log_insert_auth" ON parcelas_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger de audit (SECURITY DEFINER para ter acesso a auth.uid())
CREATE OR REPLACE FUNCTION log_parcela_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO parcelas_log (parcela_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, auth.uid());
  END IF;
  IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
    INSERT INTO parcelas_log (parcela_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parcelas_audit ON parcelas;
CREATE TRIGGER parcelas_audit
  AFTER UPDATE ON parcelas FOR EACH ROW EXECUTE FUNCTION log_parcela_changes();
```

---

## 005 — Configurações do Sistema

**Arquivo:** `supabase/migrations/005_configuracoes.sql`  
**Quando rodar:** Após a migration 003.

Adiciona o campo `ativo` à tabela `parcerias` e cria a tabela `configuracoes` (singleton — apenas uma linha com `id = 1`) para armazenar dados da clínica e preferências de notificação.

```sql
-- Adiciona campo ativo em parcerias
ALTER TABLE parcerias ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Tabela de configurações (singleton)
CREATE TABLE IF NOT EXISTS configuracoes (
  id                  INT PRIMARY KEY DEFAULT 1,
  nome_clinica        TEXT NOT NULL DEFAULT 'Parcerias Clínicas',
  logo_url            TEXT,
  email_notificacao   TEXT[] DEFAULT ARRAY[]::TEXT[],
  notificacao_ativa   BOOLEAN DEFAULT TRUE,
  fuso_horario        TEXT DEFAULT 'America/Sao_Paulo',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes ADD CONSTRAINT configuracoes_singleton CHECK (id = 1);

CREATE TRIGGER configuracoes_updated_at
  BEFORE UPDATE ON configuracoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO configuracoes DEFAULT VALUES ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_read_auth"   ON configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_write_admin" ON configuracoes FOR ALL TO authenticated
  USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
```

---

## 006 — Agendamento de Backup Diário

**Arquivo:** `supabase/migrations/006_cron_backup.sql`  
**Quando rodar:** Após a Edge Function `backup-banco` estar deployada e as extensões `pg_cron` e `pg_net` habilitadas.

Agenda o backup automático diário às **03:00 BRT** (06:00 UTC).

```sql
SELECT cron.schedule(
  'backup-diario-banco',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/backup-banco',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := '{}'::jsonb
    )
  $$
);
```

---

## Edge Functions

### `calcular-rateio`
**Arquivo:** `supabase/functions/calcular-rateio/index.ts`  
Calcula o rateio de um valor dado o tipo de parceria (A, B ou C). Chamada via HTTP com `{ parceria_id, valor }`.

### `notificar-vencidas`
**Arquivo:** `supabase/functions/notificar-vencidas/index.ts`  
Busca parcelas com `status = 'pendente'` e `data_vencimento < hoje`, monta e-mail HTML e envia via Resend.

**Secrets necessários:**
| Secret | Descrição |
|--------|-----------|
| `RESEND_API_KEY` | Chave da API do Resend (resend.com) |
| `NOTIFY_EMAIL` | E-mail que recebe o alerta diário |

**Deploy:**
```bash
npx supabase functions deploy notificar-vencidas
```

### `criar-usuario`
**Arquivo:** `supabase/functions/criar-usuario/index.ts`  
Convida um novo usuário via `auth.admin.inviteUserByEmail` e cria o perfil em `user_profiles`. Requer que o chamador seja Admin.

**Deploy:**
```bash
npx supabase functions deploy criar-usuario
```

### `backup-banco`
**Arquivo:** `supabase/functions/backup-banco/index.ts`  
Exporta todas as tabelas do sistema como JSON e salva no bucket `backups` do Supabase Storage. Remove automaticamente backups com mais de **30 dias**.

**Tabelas exportadas:** `parcerias`, `profissionais`, `lancamentos`, `parcelas`, `parcelas_log`, `user_profiles`, `configuracoes`

**Arquivo gerado:** `backup_YYYY-MM-DDTHH-MM-SS.json` no bucket `backups` (privado)

**Agendamento:** Diariamente às 03:00 BRT via pg_cron (migration 006)

**Como acessar os backups:**  
Supabase Dashboard → Storage → `backups`

**Como testar manualmente:**  
Supabase Dashboard → Edge Functions → `backup-banco` → Invoke

**Deploy:**
```bash
npx supabase functions deploy backup-banco
```
