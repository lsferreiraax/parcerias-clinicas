-- ─────────────────────────────────────────────
-- Audit log de exclusão de lançamentos + CASCADE nas parcelas
-- ─────────────────────────────────────────────

-- 1. Tabela de log de exclusão de lançamentos
--    Mantém o registro mesmo após o lançamento ser excluído
CREATE TABLE IF NOT EXISTS lancamentos_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID        NOT NULL,   -- referência histórica (sem FK pois o registro é deletado)
  paciente      TEXT        NOT NULL,
  parceria_id   TEXT        NOT NULL,
  valor_total   NUMERIC     NOT NULL,
  num_parcelas  INT         NOT NULL DEFAULT 1,
  motivo        TEXT        NOT NULL,
  excluido_por  UUID        REFERENCES auth.users(id),
  excluido_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lancamentos_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_lancamentos_read_admin"
  ON lancamentos_log FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'gestor'));

CREATE POLICY "log_lancamentos_insert_auth"
  ON lancamentos_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- 2. Garante CASCADE: ao excluir lançamento, parcelas são removidas automaticamente
--    Remove FK existente (nome padrão do Supabase/Postgres) e recria com CASCADE
ALTER TABLE parcelas
  DROP CONSTRAINT IF EXISTS parcelas_lancamento_id_fkey;

ALTER TABLE parcelas
  ADD CONSTRAINT parcelas_lancamento_id_fkey
  FOREIGN KEY (lancamento_id)
  REFERENCES lancamentos(id)
  ON DELETE CASCADE;
