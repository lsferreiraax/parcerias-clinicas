# Feature: Perfis de Acesso

## Visão Geral

Implementação de controle de acesso baseado em perfis (RBAC — Role-Based Access Control) para o sistema Parcerias Clínicas. Cada usuário terá um perfil que determina quais páginas e ações ele pode executar, tanto no frontend quanto no banco de dados (via RLS do Supabase).

---

## Perfis

### 👑 Admin
Acesso irrestrito ao sistema. Responsável pela configuração e gestão de usuários.

**Permissões:**
- Todas as páginas e ações
- Criar, editar e excluir lançamentos
- Baixar e editar parcelas
- Ver Resumo e Extrato de todos os profissionais
- Gerenciar usuários (criar, editar perfil, desativar)

---

### 👤 Gestor
Opera o dia a dia do sistema. Não gerencia usuários.

**Permissões:**
- Dashboard, Lançamentos, Parcelas, Resumo, Extrato (todos os profissionais)
- Criar e editar lançamentos
- Baixar parcelas
- ❌ Não pode excluir lançamentos
- ❌ Não acessa o gerenciamento de usuários

---

### 👁️ Profissional
Acesso restrito ao próprio extrato financeiro.

**Permissões:**
- ✅ Apenas a página Extrato — filtrada automaticamente para o seu tipo (camta, medico, psi1, psi2)
- ❌ Não vê Dashboard, Lançamentos, Parcelas, Resumo
- ❌ Não vê dados de outros profissionais

---

## Matriz de Permissões

| Recurso                        | Admin | Gestor | Profissional |
|-------------------------------|-------|--------|--------------|
| Dashboard                     | ✅    | ✅     | ❌           |
| Lançamentos — visualizar      | ✅    | ✅     | ❌           |
| Lançamentos — criar           | ✅    | ✅     | ❌           |
| Lançamentos — excluir         | ✅    | ❌     | ❌           |
| Parcelas — visualizar         | ✅    | ✅     | ❌           |
| Parcelas — baixar             | ✅    | ✅     | ❌           |
| Resumo                        | ✅    | ✅     | ❌           |
| Extrato — todos               | ✅    | ✅     | ❌           |
| Extrato — somente o próprio   | ✅    | ✅     | ✅           |
| Gerenciar usuários            | ✅    | ❌     | ❌           |

---

## Modelo de Dados

### Nova tabela: `user_profiles`

```sql
CREATE TABLE user_profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('admin', 'gestor', 'profissional')),
  tipo_profissional TEXT CHECK (tipo_profissional IN ('camta', 'medico', 'psi1', 'psi2')),
  -- tipo_profissional obrigatório quando role = 'profissional'
  ativo            BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**Regra de negócio:** quando `role = 'profissional'`, o campo `tipo_profissional` é obrigatório e determina qual coluna de valor o usuário enxerga no Extrato.

---

## Arquitetura Frontend

### Novos arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/contexts/PerfilContext.tsx` | Carrega e expõe o perfil do usuário autenticado |
| `src/hooks/usePerfil.ts` | Hook de acesso ao contexto de perfil |
| `src/components/auth/RoleGuard.tsx` | Componente que renderiza filhos só se o perfil tiver permissão |
| `src/pages/Usuarios.tsx` | Página de gerenciamento de usuários (somente Admin) |
| `src/services/usuarios.ts` | CRUD de `user_profiles` |
| `supabase/migrations/003_user_profiles.sql` | Migration da tabela e RLS |

### Arquivos modificados

| Arquivo | O que muda |
|---------|-----------|
| `src/main.tsx` | Rota `/usuarios` protegida por perfil Admin |
| `src/components/layout/Layout.tsx` | Sidebar oculta itens sem permissão; exibe nome e perfil do usuário |
| `src/pages/Extrato.tsx` | Se perfil = Profissional, trava o seletor no próprio tipo |
| `src/pages/Lancamentos.tsx` | Oculta botão Excluir para perfil Gestor |
| `src/contexts/AuthContext.tsx` | Integra carregamento do perfil junto com a sessão |

---

## RLS (Row Level Security)

### `user_profiles`
- `SELECT`: usuário vê apenas o próprio perfil; Admin vê todos
- `INSERT/UPDATE/DELETE`: apenas Admin

### `lancamentos`
- `DELETE`: apenas Admin (via policy `role = 'admin'`)
- `SELECT/INSERT/UPDATE`: Admin e Gestor

### `parcelas`
- `SELECT`: Admin, Gestor e Profissional (profissional filtrado pelo `lancamento_id` onde tem valor > 0)

---

## Fluxo de Cadastro de Usuário

1. Admin acessa **Configurações → Usuários**
2. Informa e-mail, nome e perfil
3. Sistema chama `supabase.auth.admin.inviteUserByEmail()` — o usuário recebe um e-mail para definir a senha
4. Ao aceitar o convite, o perfil (`user_profiles`) já está criado com o papel correto
5. No primeiro login, o usuário é direcionado para a tela adequada ao seu perfil

---

## Critérios de Aceite

- [ ] Usuário com perfil `profissional` só vê a página Extrato, travada no seu tipo
- [ ] Usuário com perfil `gestor` não vê o botão Excluir em Lançamentos
- [ ] Usuário com perfil `gestor` não vê o item Usuários no sidebar
- [ ] Usuário com perfil `admin` acessa tudo sem restrição
- [ ] RLS impede acesso direto ao banco mesmo via API sem o perfil correto
- [ ] Admin consegue criar, editar perfil e desativar usuários pela interface
- [ ] Usuário desativado não consegue fazer login

---

## Status

- [x] Documentação criada
- [ ] Migration `003_user_profiles.sql`
- [ ] `PerfilContext` e `RoleGuard`
- [ ] Página Usuários (Admin)
- [ ] Ajustes nas páginas existentes
- [ ] Testes e deploy
