-- ─────────────────────────────────────────────
-- Adiciona campos nome_responsavel e data_pagamento à tabela lancamentos
-- ─────────────────────────────────────────────

ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS nome_responsavel TEXT,
  ADD COLUMN IF NOT EXISTS data_pagamento   DATE;
