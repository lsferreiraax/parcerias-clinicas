-- ─────────────────────────────────────────────
-- Feature: Repasse aos profissionais
-- ─────────────────────────────────────────────

-- 1. Tabela de repasses
CREATE TABLE IF NOT EXISTS repasses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id  UUID        NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  tipo           TEXT        NOT NULL CHECK (tipo IN ('camta', 'medico', 'psi1', 'psi2')),
  valor_original NUMERIC(10,2) NOT NULL,   -- valor calculado no rateio
  valor_repasse  NUMERIC(10,2) NOT NULL,   -- pode ser editado
  status         TEXT        NOT NULL DEFAULT 'nao_conciliado'
                             CHECK (status IN ('conciliado', 'nao_conciliado')),
  data_repasse   DATE,                     -- data em que o repasse foi efetuado
  observacoes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lancamento_id, tipo)
);

-- 2. Log de alterações de repasse
CREATE TABLE IF NOT EXISTS repasses_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  repasse_id     UUID        NOT NULL REFERENCES repasses(id) ON DELETE CASCADE,
  campo          TEXT        NOT NULL,   -- 'valor_repasse', 'status', 'data_repasse'
  valor_anterior TEXT,
  valor_novo     TEXT,
  motivo         TEXT        NOT NULL,
  alterado_por   UUID        REFERENCES auth.users(id),
  alterado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Trigger: cria repasses automaticamente ao inserir lançamento
CREATE OR REPLACE FUNCTION criar_repasses_lancamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.camta_valor  > 0 THEN
    INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
    VALUES (NEW.id, 'camta',  NEW.camta_valor,  NEW.camta_valor)
    ON CONFLICT (lancamento_id, tipo) DO NOTHING;
  END IF;
  IF NEW.medico_valor > 0 THEN
    INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
    VALUES (NEW.id, 'medico', NEW.medico_valor, NEW.medico_valor)
    ON CONFLICT (lancamento_id, tipo) DO NOTHING;
  END IF;
  IF NEW.psi1_valor   > 0 THEN
    INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
    VALUES (NEW.id, 'psi1',   NEW.psi1_valor,   NEW.psi1_valor)
    ON CONFLICT (lancamento_id, tipo) DO NOTHING;
  END IF;
  IF NEW.psi2_valor   > 0 THEN
    INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
    VALUES (NEW.id, 'psi2',   NEW.psi2_valor,   NEW.psi2_valor)
    ON CONFLICT (lancamento_id, tipo) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER repasses_apos_lancamento
  AFTER INSERT ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION criar_repasses_lancamento();

-- 4. Trigger: atualiza valor_original nos repasses não conciliados ao editar lançamento
CREATE OR REPLACE FUNCTION atualizar_repasses_lancamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza apenas repasses ainda não conciliados
  IF NEW.camta_valor  IS DISTINCT FROM OLD.camta_valor  THEN
    UPDATE repasses SET valor_original = NEW.camta_valor, valor_repasse = NEW.camta_valor, updated_at = NOW()
    WHERE lancamento_id = NEW.id AND tipo = 'camta'  AND status = 'nao_conciliado';
  END IF;
  IF NEW.medico_valor IS DISTINCT FROM OLD.medico_valor THEN
    UPDATE repasses SET valor_original = NEW.medico_valor, valor_repasse = NEW.medico_valor, updated_at = NOW()
    WHERE lancamento_id = NEW.id AND tipo = 'medico' AND status = 'nao_conciliado';
  END IF;
  IF NEW.psi1_valor   IS DISTINCT FROM OLD.psi1_valor   THEN
    UPDATE repasses SET valor_original = NEW.psi1_valor, valor_repasse = NEW.psi1_valor, updated_at = NOW()
    WHERE lancamento_id = NEW.id AND tipo = 'psi1'   AND status = 'nao_conciliado';
  END IF;
  IF NEW.psi2_valor   IS DISTINCT FROM OLD.psi2_valor   THEN
    UPDATE repasses SET valor_original = NEW.psi2_valor, valor_repasse = NEW.psi2_valor, updated_at = NOW()
    WHERE lancamento_id = NEW.id AND tipo = 'psi2'   AND status = 'nao_conciliado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER repasses_apos_edicao_lancamento
  AFTER UPDATE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION atualizar_repasses_lancamento();

-- 5. Trigger: atualiza updated_at nos repasses
CREATE OR REPLACE FUNCTION set_repasse_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER repasses_updated_at
  BEFORE UPDATE ON repasses
  FOR EACH ROW EXECUTE FUNCTION set_repasse_updated_at();

-- 6. RLS
ALTER TABLE repasses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE repasses_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repasses_read_auth"
  ON repasses FOR SELECT TO authenticated USING (true);

CREATE POLICY "repasses_write_admin_gestor"
  ON repasses FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'gestor'))
  WITH CHECK (get_my_role() IN ('admin', 'gestor'));

CREATE POLICY "repasses_log_read_auth"
  ON repasses_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "repasses_log_insert_auth"
  ON repasses_log FOR INSERT TO authenticated WITH CHECK (true);

-- 7. Gera repasses para lançamentos já existentes (retroativo)
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
