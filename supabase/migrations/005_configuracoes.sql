-- ─────────────────────────────────────────────
-- Configurações do sistema (singleton)
-- ─────────────────────────────────────────────

-- 1. Adiciona campo ativo na tabela parcerias
ALTER TABLE parcerias ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- 2. Tabela de configurações (apenas uma linha — id = 1)
CREATE TABLE IF NOT EXISTS configuracoes (
  id                  INT PRIMARY KEY DEFAULT 1,
  nome_clinica        TEXT NOT NULL DEFAULT 'Parcerias Clínicas',
  logo_url            TEXT,
  email_notificacao   TEXT[] DEFAULT ARRAY[]::TEXT[],
  notificacao_ativa   BOOLEAN DEFAULT TRUE,
  fuso_horario        TEXT DEFAULT 'America/Sao_Paulo',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes ADD CONSTRAINT IF NOT EXISTS configuracoes_singleton CHECK (id = 1);

-- Trigger updated_at
CREATE TRIGGER configuracoes_updated_at
  BEFORE UPDATE ON configuracoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Linha inicial (idempotente)
INSERT INTO configuracoes DEFAULT VALUES ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_read_auth" ON configuracoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "config_write_admin" ON configuracoes
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');
