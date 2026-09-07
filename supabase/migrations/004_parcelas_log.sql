-- ─────────────────────────────────────────────
-- Gestão avançada de parcelas: audit log + renegociação
-- ─────────────────────────────────────────────

-- 1. Adiciona status 'renegociada' ao CHECK
ALTER TABLE parcelas DROP CONSTRAINT IF EXISTS parcelas_status_check;
ALTER TABLE parcelas ADD CONSTRAINT parcelas_status_check
  CHECK (status IN ('pendente','pago','vencido','renegociada'));

-- 2. Tabela de audit log
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
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'gestor'));

CREATE POLICY "log_insert_auth" ON parcelas_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Trigger de audit (SECURITY DEFINER para ter acesso a auth.uid())
CREATE OR REPLACE FUNCTION log_parcela_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  AFTER UPDATE ON parcelas
  FOR EACH ROW EXECUTE FUNCTION log_parcela_changes();
