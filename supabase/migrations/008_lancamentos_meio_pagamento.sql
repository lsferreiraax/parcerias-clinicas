-- ─────────────────────────────────────────────
-- Adiciona campo meio_pagamento à tabela lancamentos
-- ─────────────────────────────────────────────

ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS meio_pagamento TEXT[] DEFAULT ARRAY[]::TEXT[];
