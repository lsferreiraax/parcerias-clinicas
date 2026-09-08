-- ─────────────────────────────────────────────
-- Log de edições e cancelamentos de lançamentos
-- ─────────────────────────────────────────────

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

ALTER TABLE lancamentos_edicoes_log ENABLE ROW LEVEL SECURITY;

-- Apenas admin/gestor pode ler o log
CREATE POLICY "edicoes_log_read_admin_gestor"
  ON lancamentos_edicoes_log FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'gestor'));

-- Qualquer autenticado pode inserir (a escrita vem sempre do backend/service)
CREATE POLICY "edicoes_log_insert_auth"
  ON lancamentos_edicoes_log FOR INSERT TO authenticated
  WITH CHECK (true);
