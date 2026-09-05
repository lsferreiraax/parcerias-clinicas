-- ─────────────────────────────────────────────
-- PARCERIAS CLÍNICAS — Schema inicial
-- ─────────────────────────────────────────────

-- Tipos de parceria e seus percentuais
CREATE TABLE IF NOT EXISTS parcerias (
  id          TEXT PRIMARY KEY,          -- 'A', 'B', 'C'
  descricao   TEXT NOT NULL,
  camta_pct   NUMERIC(5,2) DEFAULT 0,
  medico_pct  NUMERIC(5,2) DEFAULT 0,
  psi1_pct    NUMERIC(5,2) DEFAULT 0,
  psi2_pct    NUMERIC(5,2) DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO parcerias VALUES
  ('A', 'Camta + Psi1 + Psi2', 20, 0,  30, 50),
  ('B', 'Médico + Psi1 + Psi2', 0, 10, 40, 50),
  ('C', 'Psi1 + Psi2',          0, 0,  40, 60)
ON CONFLICT (id) DO NOTHING;

-- Profissionais
CREATE TABLE IF NOT EXISTS profissionais (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('camta','medico','psi1','psi2')),
  ativo      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO profissionais (nome, tipo) VALUES
  ('Camta',   'camta'),
  ('Médico',  'medico'),
  ('Psi1',    'psi1'),
  ('Psi2',    'psi2')
ON CONFLICT DO NOTHING;

-- Lançamentos (atendimentos)
CREATE TABLE IF NOT EXISTS lancamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_atendimento DATE NOT NULL,
  paciente         TEXT NOT NULL,
  parceria_id      TEXT NOT NULL REFERENCES parcerias(id),
  forma_pagamento  TEXT NOT NULL CHECK (forma_pagamento IN ('avista','parcelado')),
  num_parcelas     INT NOT NULL DEFAULT 1,
  valor_total      NUMERIC(10,2) NOT NULL,
  camta_valor      NUMERIC(10,2) DEFAULT 0,
  medico_valor     NUMERIC(10,2) DEFAULT 0,
  psi1_valor       NUMERIC(10,2) DEFAULT 0,
  psi2_valor       NUMERIC(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado')),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Parcelas
CREATE TABLE IF NOT EXISTS parcelas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id    UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  parcela_num      INT NOT NULL,
  parcela_total    INT NOT NULL,
  data_vencimento  DATE NOT NULL,
  data_pagamento   DATE,
  valor_parcela    NUMERIC(10,2) NOT NULL,
  camta_valor      NUMERIC(10,2) DEFAULT 0,
  medico_valor     NUMERIC(10,2) DEFAULT 0,
  psi1_valor       NUMERIC(10,2) DEFAULT 0,
  psi2_valor       NUMERIC(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','pago','vencido')),
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Views de resumo ──────────────────────────────────────────────────

CREATE OR REPLACE VIEW resumo_por_parceria AS
SELECT
  p.id            AS parceria,
  p.descricao,
  COUNT(DISTINCT l.id)              AS total_atendimentos,
  COALESCE(SUM(l.valor_total),0)    AS valor_total,
  COALESCE(SUM(l.camta_valor),0)  + COALESCE(SUM(pa.camta_valor),0)   AS camta_total,
  COALESCE(SUM(l.medico_valor),0) + COALESCE(SUM(pa.medico_valor),0)  AS medico_total,
  COALESCE(SUM(l.psi1_valor),0)   + COALESCE(SUM(pa.psi1_valor),0)   AS psi1_total,
  COALESCE(SUM(l.psi2_valor),0)   + COALESCE(SUM(pa.psi2_valor),0)   AS psi2_total
FROM parcerias p
LEFT JOIN lancamentos l ON l.parceria_id = p.id
LEFT JOIN parcelas pa   ON pa.lancamento_id = l.id
GROUP BY p.id, p.descricao
ORDER BY p.id;

CREATE OR REPLACE VIEW resumo_profissional AS
SELECT 'camta'  AS profissional,
  COALESCE(SUM(l.camta_valor),0)  + COALESCE(SUM(pa.camta_valor),0)  AS total
FROM lancamentos l LEFT JOIN parcelas pa ON pa.lancamento_id = l.id
UNION ALL
SELECT 'medico',
  COALESCE(SUM(l.medico_valor),0) + COALESCE(SUM(pa.medico_valor),0)
FROM lancamentos l LEFT JOIN parcelas pa ON pa.lancamento_id = l.id
UNION ALL
SELECT 'psi1',
  COALESCE(SUM(l.psi1_valor),0)   + COALESCE(SUM(pa.psi1_valor),0)
FROM lancamentos l LEFT JOIN parcelas pa ON pa.lancamento_id = l.id
UNION ALL
SELECT 'psi2',
  COALESCE(SUM(l.psi2_valor),0)   + COALESCE(SUM(pa.psi2_valor),0)
FROM lancamentos l LEFT JOIN parcelas pa ON pa.lancamento_id = l.id;

-- ── RLS (Row Level Security) ─────────────────────────────────────────
ALTER TABLE lancamentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcerias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;

-- Por ora, acesso total para usuários autenticados
CREATE POLICY "auth_all_lancamentos"   ON lancamentos   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_parcelas"      ON parcelas      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_parcerias"    ON parcerias     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_profissionais" ON profissionais FOR SELECT TO authenticated USING (true);
