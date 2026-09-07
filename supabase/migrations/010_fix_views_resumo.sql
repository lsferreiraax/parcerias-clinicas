-- ─────────────────────────────────────────────
-- Corrige as views de resumo
--
-- Problemas corrigidos:
--   1. Dupla contagem: views somavam lancamentos + parcelas causando
--      valores dobrados em lançamentos parcelados. Removido JOIN com parcelas
--      pois lancamentos já armazena o rateio do valor total.
--   2. Lançamentos cancelados eram incluídos nos totais. Adicionado filtro
--      WHERE status != 'cancelado'.
-- ─────────────────────────────────────────────

CREATE OR REPLACE VIEW resumo_por_parceria AS
SELECT
  p.id            AS parceria,
  p.descricao,
  COUNT(l.id)                         AS total_atendimentos,
  COALESCE(SUM(l.valor_total),  0)    AS valor_total,
  COALESCE(SUM(l.camta_valor),  0)    AS camta_total,
  COALESCE(SUM(l.medico_valor), 0)    AS medico_total,
  COALESCE(SUM(l.psi1_valor),   0)    AS psi1_total,
  COALESCE(SUM(l.psi2_valor),   0)    AS psi2_total
FROM parcerias p
LEFT JOIN lancamentos l
  ON l.parceria_id = p.id
  AND l.status != 'cancelado'
GROUP BY p.id, p.descricao
ORDER BY p.id;

CREATE OR REPLACE VIEW resumo_profissional AS
SELECT 'camta'  AS profissional, COALESCE(SUM(camta_valor),  0) AS total
  FROM lancamentos WHERE status != 'cancelado'
UNION ALL
SELECT 'medico', COALESCE(SUM(medico_valor), 0)
  FROM lancamentos WHERE status != 'cancelado'
UNION ALL
SELECT 'psi1',   COALESCE(SUM(psi1_valor),   0)
  FROM lancamentos WHERE status != 'cancelado'
UNION ALL
SELECT 'psi2',   COALESCE(SUM(psi2_valor),   0)
  FROM lancamentos WHERE status != 'cancelado';
