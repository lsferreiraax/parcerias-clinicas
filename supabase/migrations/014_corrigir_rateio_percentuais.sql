-- Migration 014: Corrigir percentuais da Parceria C e recalcular rateios
-- Problema: Parceria C foi editada com valores 0.4 e 0.6 (frações) ao invés de 40 e 60 (inteiros)
-- O sistema armazena percentuais como inteiros (ex: 40 = 40%)

-- Passo 1: Corrigir Parceria C (deve armazenar 40 e 60, não 0.4 e 0.6)
UPDATE parcerias
SET psi1_pct = 40,
    psi2_pct = 60
WHERE id = 'C'
  AND psi1_pct < 1;  -- proteção: só aplica se estiver com valor fracionário

-- Passo 2: Recalcular rateio de todos os lançamentos não cancelados
-- Fórmula: valor_total * percentual / 100
UPDATE lancamentos l
SET
  camta_valor  = ROUND((l.valor_total * p.camta_pct  / 100.0)::numeric, 2),
  medico_valor = ROUND((l.valor_total * p.medico_pct / 100.0)::numeric, 2),
  psi1_valor   = ROUND((l.valor_total * p.psi1_pct   / 100.0)::numeric, 2),
  psi2_valor   = ROUND((l.valor_total * p.psi2_pct   / 100.0)::numeric, 2)
FROM parcerias p
WHERE l.parceria_id = p.id
  AND l.status != 'cancelado';

-- Passo 3: Recalcular repasses vinculados às parcelas pagas
-- Proporcional ao valor da parcela em relação ao total do lançamento
UPDATE repasses r
SET valor_repasse = ROUND(
  (
    SELECT
      CASE r.tipo_profissional
        WHEN 'camta'  THEN p.camta_pct
        WHEN 'medico' THEN p.medico_pct
        WHEN 'psi1'   THEN p.psi1_pct
        WHEN 'psi2'   THEN p.psi2_pct
        ELSE 0
      END
      * parc.valor_parcela / 100.0
    FROM parcelas parc
    JOIN lancamentos l ON l.id = parc.lancamento_id
    JOIN parcerias p   ON p.id = l.parceria_id
    WHERE parc.id = r.parcela_id
  )::numeric,
  2
)
WHERE r.status = 'nao_conciliado';

-- Verificação final
SELECT
  l.id,
  l.parceria_id,
  l.paciente,
  l.valor_total,
  l.camta_valor,
  l.medico_valor,
  l.psi1_valor,
  l.psi2_valor,
  ROUND((l.camta_valor + l.medico_valor + l.psi1_valor + l.psi2_valor)::numeric, 2) AS soma_rateio,
  l.status
FROM lancamentos l
WHERE l.status != 'cancelado'
ORDER BY l.created_at DESC
LIMIT 20;
