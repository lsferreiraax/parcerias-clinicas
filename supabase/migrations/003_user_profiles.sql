-- ─────────────────────────────────────────────
-- Perfis de acesso (RBAC)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  role              TEXT NOT NULL CHECK (role IN ('admin', 'gestor', 'profissional')),
  tipo_profissional TEXT CHECK (tipo_profissional IN ('camta', 'medico', 'psi1', 'psi2')),
  ativo             BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas o próprio perfil
CREATE POLICY "perfil_select_proprio"
  ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admin vê todos os perfis
CREATE POLICY "perfil_select_admin"
  ON user_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- Apenas admin pode inserir, atualizar e excluir perfis
CREATE POLICY "perfil_write_admin"
  ON user_profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- ── Restringe DELETE em lancamentos para apenas Admin ─────────────────
DROP POLICY IF EXISTS "auth_all_lancamentos" ON lancamentos;

CREATE POLICY "lancamentos_read_write"
  ON lancamentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "lancamentos_insert_update"
  ON lancamentos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "lancamentos_update_patch"
  ON lancamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "lancamentos_delete_admin"
  ON lancamentos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );
