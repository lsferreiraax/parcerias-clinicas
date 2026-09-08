# Scripts de Banco de Dados — Parcerias Clínicas

Histórico de todas as migrations e scripts SQL aplicados no projeto.

---

## 001 — Schema inicial

**Arquivo:** `supabase/migrations/001_schema.sql`

Criação das tabelas base do sistema:
- `parcerias` — configuração das parcerias (A, B, C) com percentuais por profissional
- `lancamentos` — lançamentos de atendimentos com rateio calculado
- `parcelas` — parcelas de pagamento geradas automaticamente
- `perfis` — perfis de usuário com role (admin, gestor, profissional)

Inclui:
- RLS habilitado em todas as tabelas
- Função `get_my_role()` com SECURITY DEFINER (evita recursão no RLS)
- Trigger para calcular rateio automaticamente ao inserir lançamento
- Políticas de acesso por role

---

## 002 a 006 — Evolução inicial do schema

Ajustes incrementais nas tabelas iniciais (índices, constraints, ajustes de RLS).

---

## 007 — Campos adicionais em lançamentos

**Arquivo:** `supabase/migrations/007_lancamentos_campos.sql`

```sql
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS nome_responsavel TEXT,
  ADD COLUMN IF NOT EXISTS data_pagamento   DATE;
```

**Propósito:** Armazenar o nome do responsável pelo atendimento e a data em que o pagamento da sessão foi recebido.

---

## 008 — Meio de pagamento em lançamentos

**Arquivo:** `supabase/migrations/008_lancamentos_meio_pagamento.sql`

```sql
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS meio_pagamento TEXT[] DEFAULT ARRAY[]::TEXT[];
```

**Propósito:** Permitir múltiplos meios de pagamento por lançamento (Cartão de Crédito, Pix, Dinheiro). Armazenado como array de texto.

---

## 009 — Log de exclusões e cascade em parcelas

**Arquivo:** `supabase/migrations/009_lancamentos_log_cascade.sql`

Cria tabela de auditoria de exclusões:

```sql
CREATE TABLE IF NOT EXISTS lancamentos_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente     TEXT,
  parceria_id  TEXT,
  valor_total  NUMERIC(10,2),
  motivo       TEXT NOT NULL,
  excluido_por UUID REFERENCES auth.users(id),
  excluido_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Recria a FK de parcelas com CASCADE:

```sql
ALTER TABLE parcelas DROP CONSTRAINT IF EXISTS parcelas_lancamento_id_fkey;
ALTER TABLE parcelas
  ADD CONSTRAINT parcelas_lancamento_id_fkey
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id) ON DELETE CASCADE;
```

**Propósito:** Ao excluir um lançamento, suas parcelas são removidas automaticamente. A exclusão é registrada em log com motivo obrigatório (auditoria).

---

## 010 — Correção das views de resumo

**Arquivo:** `supabase/migrations/010_fix_views_resumo.sql`

Reescrita das views `resumo_por_parceria` e `resumo_profissional`:

```sql
-- Remove JOIN com parcelas (causava double-counting)
-- Adiciona filtro de cancelados
CREATE OR REPLACE VIEW resumo_por_parceria AS
SELECT
  parceria_id,
  COUNT(*) FILTER (WHERE status != 'cancelado') AS total_atendimentos,
  SUM(valor_total) FILTER (WHERE status != 'cancelado') AS total_valor,
  ...
FROM lancamentos
WHERE status != 'cancelado'
GROUP BY parceria_id;
```

**Bugs corrigidos:**
1. **Double-counting:** Views faziam `JOIN lancamentos + parcelas`, somando valores duplicados quando o lançamento era parcelado.
2. **Cancelados nos totais:** Lançamentos cancelados eram contabilizados nos KPIs e resumos.

---

## 011 — Feature: Repasses

**Arquivo:** `supabase/migrations/011_repasses.sql`

### Tabela `repasses`

```sql
CREATE TABLE IF NOT EXISTS repasses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id  UUID        NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  tipo           TEXT        NOT NULL CHECK (tipo IN ('camta', 'medico', 'psi1', 'psi2')),
  valor_original NUMERIC(10,2) NOT NULL,
  valor_repasse  NUMERIC(10,2) NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'nao_conciliado'
                             CHECK (status IN ('conciliado', 'nao_conciliado')),
  data_repasse   DATE,
  observacoes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lancamento_id, tipo)
);
```

### Tabela `repasses_log`

```sql
CREATE TABLE IF NOT EXISTS repasses_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  repasse_id     UUID        NOT NULL REFERENCES repasses(id) ON DELETE CASCADE,
  campo          TEXT        NOT NULL,
  valor_anterior TEXT,
  valor_novo     TEXT,
  motivo         TEXT        NOT NULL,
  alterado_por   UUID        REFERENCES auth.users(id),
  alterado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Trigger: criação automática de repasses ao inserir lançamento

```sql
CREATE OR REPLACE FUNCTION criar_repasses_lancamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.camta_valor  > 0 THEN INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse) VALUES (NEW.id, 'camta',  NEW.camta_valor,  NEW.camta_valor)  ON CONFLICT DO NOTHING; END IF;
  IF NEW.medico_valor > 0 THEN INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse) VALUES (NEW.id, 'medico', NEW.medico_valor, NEW.medico_valor) ON CONFLICT DO NOTHING; END IF;
  IF NEW.psi1_valor   > 0 THEN INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse) VALUES (NEW.id, 'psi1',   NEW.psi1_valor,   NEW.psi1_valor)   ON CONFLICT DO NOTHING; END IF;
  IF NEW.psi2_valor   > 0 THEN INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse) VALUES (NEW.id, 'psi2',   NEW.psi2_valor,   NEW.psi2_valor)   ON CONFLICT DO NOTHING; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER repasses_apos_lancamento
  AFTER INSERT ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION criar_repasses_lancamento();
```

### Trigger: atualização de repasses não conciliados ao editar lançamento

```sql
CREATE OR REPLACE FUNCTION atualizar_repasses_lancamento()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.camta_valor  IS DISTINCT FROM OLD.camta_valor  THEN
    UPDATE repasses SET valor_original = NEW.camta_valor,  valor_repasse = NEW.camta_valor,  updated_at = NOW()
    WHERE lancamento_id = NEW.id AND tipo = 'camta'  AND status = 'nao_conciliado';
  END IF;
  -- (mesmo padrão para medico, psi1, psi2)
  RETURN NEW;
END; $$;

CREATE TRIGGER repasses_apos_edicao_lancamento
  AFTER UPDATE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION atualizar_repasses_lancamento();
```

### RLS

```sql
CREATE POLICY "repasses_read_auth"       ON repasses FOR SELECT TO authenticated USING (true);
CREATE POLICY "repasses_write_admin_gestor" ON repasses FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'gestor'))
  WITH CHECK (get_my_role() IN ('admin', 'gestor'));
CREATE POLICY "repasses_log_read_auth"   ON repasses_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "repasses_log_insert_auth" ON repasses_log FOR INSERT TO authenticated WITH CHECK (true);
```

### INSERTs retroativos (lançamentos existentes antes da migration)

```sql
INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
SELECT id, 'camta',  camta_valor,  camta_valor  FROM lancamentos WHERE camta_valor  > 0 AND status != 'cancelado'
ON CONFLICT (lancamento_id, tipo) DO NOTHING;

INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
SELECT id, 'medico', medico_valor, medico_valor FROM lancamentos WHERE medico_valor > 0 AND status != 'cancelado'
ON CONFLICT (lancamento_id, tipo) DO NOTHING;

INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
SELECT id, 'psi1',   psi1_valor,   psi1_valor   FROM lancamentos WHERE psi1_valor   > 0 AND status != 'cancelado'
ON CONFLICT (lancamento_id, tipo) DO NOTHING;

INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
SELECT id, 'psi2',   psi2_valor,   psi2_valor   FROM lancamentos WHERE psi2_valor   > 0 AND status != 'cancelado'
ON CONFLICT (lancamento_id, tipo) DO NOTHING;
```

> **Observação:** Esta migration deve ser executada manualmente no SQL Editor do Supabase caso o `supabase db push` não a aplique automaticamente.

---

## 012 — Log de edições e cancelamentos de lançamentos

**Arquivo:** `supabase/migrations/012_lancamentos_edicoes_log.sql`

```sql
CREATE TABLE IF NOT EXISTS lancamentos_edicoes_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id   UUID        NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  campo           TEXT        NOT NULL,   -- ex: 'Valor Total', 'Parceria', 'status'
  valor_anterior  TEXT,
  valor_novo      TEXT,
  motivo          TEXT,                   -- obrigatório para cancelamentos
  alterado_por    UUID        REFERENCES auth.users(id),
  alterado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**RLS:**
- SELECT: apenas admin e gestor
- INSERT: qualquer autenticado (escrita via service)

**Propósito:**
- Rastrear todas as edições de lançamentos (campo a campo)
- Registrar cancelamentos com motivo obrigatório
- Acessível via botão "Histórico" (ícone History) em cada linha da tela de Lançamentos

> **Observação:** Execute esta migration manualmente no SQL Editor do Supabase antes do deploy.

---

## 013 — Repasse vinculado à baixa da parcela

**Arquivo:** `supabase/migrations/013_repasse_por_baixa_parcela.sql`

**O que muda:**
- Remove trigger `repasses_apos_lancamento` (criava repasses no INSERT do lançamento pelo valor total)
- Cria trigger `repasse_apos_baixa_parcela` em `parcelas` (AFTER UPDATE) — dispara quando `status` muda para `'pago'`

**Lógica do novo trigger (`criar_repasse_por_parcela`):**
- Calcula a proporção da parcela: `valor_parcela / valor_total`
- Cria ou acumula o repasse por tipo (camta, medico, psi1, psi2) usando `INSERT ON CONFLICT DO UPDATE`
- Acumula apenas em repasses ainda `nao_conciliado`

```sql
DROP TRIGGER IF EXISTS repasses_apos_lancamento ON lancamentos;

CREATE OR REPLACE FUNCTION criar_repasse_por_parcela()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_lanc      RECORD;
  v_proporcao NUMERIC;
  v_camta NUMERIC; v_medico NUMERIC; v_psi1 NUMERIC; v_psi2 NUMERIC;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pago' OR OLD.status = 'pago' THEN RETURN NEW; END IF;
  SELECT * INTO v_lanc FROM lancamentos WHERE id = NEW.lancamento_id;
  IF v_lanc IS NULL OR v_lanc.valor_total = 0 OR v_lanc.status = 'cancelado' THEN RETURN NEW; END IF;
  v_proporcao := ROUND(NEW.valor_parcela::NUMERIC / v_lanc.valor_total::NUMERIC, 6);
  -- cria/acumula repasses proporcionais para cada tipo ativo
  -- ... (ver arquivo completo)
  RETURN NEW;
END; $$;

CREATE TRIGGER repasse_apos_baixa_parcela
  AFTER UPDATE ON parcelas
  FOR EACH ROW EXECUTE FUNCTION criar_repasse_por_parcela();
```

**Impacto em dados existentes:** nenhum. Lançamentos/repasses já criados permanecem inalterados. A nova lógica só afeta eventos de baixa futuros.

**Verificar triggers após aplicar:**
```sql
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgrelid IN ('lancamentos'::regclass, 'parcelas'::regclass);
```

> **Execute esta migration no SQL Editor do Supabase antes do próximo deploy.**

---

## 014 — Correção de rateios (bug percentuais inteiros)

**Arquivo:** `supabase/migrations/014_corrigir_rateio_percentuais.sql`

**Problema corrigido:** O sistema armazenava percentuais como inteiros (ex: 40 = 40%), mas `calcularRateio` multiplicava sem dividir por 100, gerando valores 100× maiores. Adicionalmente, a Parceria C foi editada via UI com valores fracionários (0.4 e 0.6) ao invés de inteiros (40 e 60).

**O que o script faz:**
1. Corrige Parceria C: `psi1_pct = 40`, `psi2_pct = 60` (proteção: só aplica se `psi1_pct < 1`)
2. Recalcula todos os lançamentos não cancelados: `valor = valor_total * pct / 100`
3. Recalcula repasses `nao_conciliado` proporcionalmente ao valor da parcela

```sql
-- Passo 1: Corrigir Parceria C
UPDATE parcerias SET psi1_pct = 40, psi2_pct = 60 WHERE id = 'C' AND psi1_pct < 1;

-- Passo 2: Recalcular rateio dos lançamentos
UPDATE lancamentos l
SET
  camta_valor  = ROUND((l.valor_total * p.camta_pct  / 100.0)::numeric, 2),
  medico_valor = ROUND((l.valor_total * p.medico_pct / 100.0)::numeric, 2),
  psi1_valor   = ROUND((l.valor_total * p.psi1_pct   / 100.0)::numeric, 2),
  psi2_valor   = ROUND((l.valor_total * p.psi2_pct   / 100.0)::numeric, 2)
FROM parcerias p
WHERE l.parceria_id = p.id AND l.status != 'cancelado';

-- Passo 3: Recalcular repasses nao_conciliado
UPDATE repasses r
SET valor_repasse = ROUND(
  (SELECT
    CASE r.tipo_profissional
      WHEN 'camta'  THEN p.camta_pct
      WHEN 'medico' THEN p.medico_pct
      WHEN 'psi1'   THEN p.psi1_pct
      WHEN 'psi2'   THEN p.psi2_pct
      ELSE 0
    END * parc.valor_parcela / 100.0
  FROM parcelas parc
  JOIN lancamentos l ON l.id = parc.lancamento_id
  JOIN parcerias p   ON p.id = l.parceria_id
  WHERE parc.id = r.parcela_id)::numeric, 2)
WHERE r.status = 'nao_conciliado';
```

> **Execute esta migration no SQL Editor do Supabase ANTES do próximo deploy. O código frontend (`rateio.ts`) já foi corrigido para dividir por 100.**

---

## Diagnóstico útil

```sql
-- Verificar repasses criados
SELECT tipo, COUNT(*), SUM(valor_repasse) FROM repasses GROUP BY tipo;

-- Verificar lançamentos elegíveis vs repasses existentes
SELECT
  COUNT(*) FILTER (WHERE camta_valor  > 0 AND status != 'cancelado') AS lancamentos_com_camta,
  COUNT(*) FILTER (WHERE medico_valor > 0 AND status != 'cancelado') AS lancamentos_com_medico,
  COUNT(*) FILTER (WHERE psi1_valor   > 0 AND status != 'cancelado') AS lancamentos_com_psi1,
  COUNT(*) FILTER (WHERE psi2_valor   > 0 AND status != 'cancelado') AS lancamentos_com_psi2
FROM lancamentos;

-- Verificar triggers ativos
SELECT tgname, tgenabled FROM pg_trigger WHERE tgrelid = 'lancamentos'::regclass;
```
