-- ─────────────────────────────────────────────────────────────────────────────
-- Feature 3.3 — Repasse vinculado à baixa da parcela
--
-- Antes: repasses criados ao INSERT do lançamento (valor total).
-- Depois: repasses criados/acumulados quando cada parcela é marcada como 'pago',
--         proporcionalmente ao valor da parcela em relação ao valor total.
--
-- Transição: lançamentos existentes já têm repasses gerados (migration 011).
--   O novo trigger só afeta novos eventos de baixa.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remove o trigger de INSERT em lancamentos (não cria mais repasses no ato)
DROP TRIGGER IF EXISTS repasses_apos_lancamento ON lancamentos;

-- 2. Cria trigger em parcelas: dispara quando status → 'pago'
CREATE OR REPLACE FUNCTION criar_repasse_por_parcela()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lanc      RECORD;
  v_proporcao NUMERIC;
  v_camta     NUMERIC;
  v_medico    NUMERIC;
  v_psi1      NUMERIC;
  v_psi2      NUMERIC;
BEGIN
  -- Só executa quando status muda para 'pago'
  IF NEW.status IS DISTINCT FROM 'pago' OR OLD.status = 'pago' THEN
    RETURN NEW;
  END IF;

  -- Busca o lançamento pai
  SELECT * INTO v_lanc FROM lancamentos WHERE id = NEW.lancamento_id;

  IF v_lanc IS NULL OR v_lanc.valor_total = 0 OR v_lanc.status = 'cancelado' THEN
    RETURN NEW;
  END IF;

  -- Proporção desta parcela em relação ao valor total do lançamento
  v_proporcao := ROUND(NEW.valor_parcela::NUMERIC / v_lanc.valor_total::NUMERIC, 6);

  v_camta  := ROUND(v_lanc.camta_valor::NUMERIC  * v_proporcao, 2);
  v_medico := ROUND(v_lanc.medico_valor::NUMERIC * v_proporcao, 2);
  v_psi1   := ROUND(v_lanc.psi1_valor::NUMERIC   * v_proporcao, 2);
  v_psi2   := ROUND(v_lanc.psi2_valor::NUMERIC   * v_proporcao, 2);

  -- Para parcelas à vista (1/1), cria ou sobrescreve o repasse inteiro.
  -- Para parcelado, acumula no repasse existente se ainda não conciliado.
  IF v_camta > 0 THEN
    INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
    VALUES (v_lanc.id, 'camta', v_camta, v_camta)
    ON CONFLICT (lancamento_id, tipo) DO UPDATE
      SET valor_original = repasses.valor_original + EXCLUDED.valor_original,
          valor_repasse  = repasses.valor_repasse  + EXCLUDED.valor_repasse,
          updated_at     = NOW()
    WHERE repasses.status = 'nao_conciliado';
  END IF;

  IF v_medico > 0 THEN
    INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
    VALUES (v_lanc.id, 'medico', v_medico, v_medico)
    ON CONFLICT (lancamento_id, tipo) DO UPDATE
      SET valor_original = repasses.valor_original + EXCLUDED.valor_original,
          valor_repasse  = repasses.valor_repasse  + EXCLUDED.valor_repasse,
          updated_at     = NOW()
    WHERE repasses.status = 'nao_conciliado';
  END IF;

  IF v_psi1 > 0 THEN
    INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
    VALUES (v_lanc.id, 'psi1', v_psi1, v_psi1)
    ON CONFLICT (lancamento_id, tipo) DO UPDATE
      SET valor_original = repasses.valor_original + EXCLUDED.valor_original,
          valor_repasse  = repasses.valor_repasse  + EXCLUDED.valor_repasse,
          updated_at     = NOW()
    WHERE repasses.status = 'nao_conciliado';
  END IF;

  IF v_psi2 > 0 THEN
    INSERT INTO repasses (lancamento_id, tipo, valor_original, valor_repasse)
    VALUES (v_lanc.id, 'psi2', v_psi2, v_psi2)
    ON CONFLICT (lancamento_id, tipo) DO UPDATE
      SET valor_original = repasses.valor_original + EXCLUDED.valor_original,
          valor_repasse  = repasses.valor_repasse  + EXCLUDED.valor_repasse,
          updated_at     = NOW()
    WHERE repasses.status = 'nao_conciliado';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER repasse_apos_baixa_parcela
  AFTER UPDATE ON parcelas
  FOR EACH ROW
  EXECUTE FUNCTION criar_repasse_por_parcela();
