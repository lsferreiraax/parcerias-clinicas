# Feature: Gestão Avançada de Parcelas

## Visão Geral

Ampliar o controle de parcelas com baixa em lote, histórico de alterações, alertas de vencimento no sistema e renegociação de parcelas vencidas.

---

## Motivação

Atualmente a baixa de parcelas é feita individualmente. Em clínicas com volume alto, isso gera trabalho manual excessivo. Além disso, não há rastro de quem baixou uma parcela nem quando, dificultando auditorias.

---

## Funcionalidades

### 1. Baixa em Lote
- Checkbox em cada linha da tabela Parcelas
- Botão "Baixar selecionadas" — abre modal de confirmação com resumo
- Registra `data_pagamento = hoje` e `status = 'pago'` em todas as selecionadas
- Apenas Admin e Gestor

### 2. Histórico de Alterações (Audit Log)
- Nova tabela `parcelas_log` registra toda alteração em `parcelas`
- Campos: `parcela_id`, `campo_alterado`, `valor_anterior`, `valor_novo`, `alterado_por` (user_id), `alterado_em`
- Implementado via trigger PostgreSQL
- Interface: botão "Ver histórico" na linha da parcela → modal com timeline

### 3. Alertas de Vencimento In-App
- Banner ou badge no sidebar quando há parcelas vencendo hoje ou amanhã
- Badge numérico no item "Parcelas" do menu
- Consulta feita no carregamento do Layout (React Query com refetch a cada 5 min)

### 4. Renegociação de Parcelas
- Parcela vencida pode ser "renegociada": nova data de vencimento + observação obrigatória
- Status muda para `'renegociada'` (novo valor permitido no CHECK)
- Registrado no `parcelas_log`
- Apenas Admin

---

## Modelo de Dados

### Nova tabela: `parcelas_log`

```sql
CREATE TABLE parcelas_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcela_id     UUID NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo     TEXT,
  alterado_por   UUID REFERENCES auth.users(id),
  alterado_em    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE parcelas_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "log_read_admin_gestor" ON parcelas_log
  FOR SELECT TO authenticated USING (get_my_role() IN ('admin', 'gestor'));
```

### Alteração na tabela `parcelas`

```sql
ALTER TABLE parcelas
  DROP CONSTRAINT parcelas_status_check,
  ADD CONSTRAINT parcelas_status_check
    CHECK (status IN ('pendente','pago','vencido','renegociada'));
```

### Trigger de audit log

```sql
CREATE OR REPLACE FUNCTION log_parcela_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO parcelas_log (parcela_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, auth.uid());
  END IF;
  IF OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento THEN
    INSERT INTO parcelas_log (parcela_id, campo_alterado, valor_anterior, valor_novo, alterado_por)
    VALUES (NEW.id, 'data_vencimento', OLD.data_vencimento::TEXT, NEW.data_vencimento::TEXT, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER parcelas_audit
  AFTER UPDATE ON parcelas
  FOR EACH ROW EXECUTE FUNCTION log_parcela_changes();
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Parcelas.tsx` | Adicionar checkboxes, botão baixa em lote, modal histórico |
| `src/components/parcelas/BaixaEmLote.tsx` | Novo — modal de confirmação em lote |
| `src/components/parcelas/HistoricoParcela.tsx` | Novo — modal timeline de alterações |
| `src/components/layout/Layout.tsx` | Badge de alerta no item Parcelas |
| `src/services/parcelas.ts` | Funções: baixarEmLote, renegociar, buscarHistorico |
| `supabase/migrations/004_parcelas_log.sql` | Nova migration |
| `docs/scripts-banco-de-dados.md` | Documentar migration 004 |

---

## Critérios de Aceite

- [ ] Baixa em lote atualiza todas as parcelas selecionadas em uma única operação
- [ ] Histórico registra alterações de status e data de vencimento com autor e data
- [ ] Badge no sidebar exibe contagem correta de parcelas vencendo hoje/amanhã
- [ ] Renegociação exige observação e registra no log
- [ ] RLS impede Profissional de acessar `parcelas_log`

---

## Status

- [x] Documentação criada
- [x] Migration `004_parcelas_log.sql`
- [x] Componentes de baixa em lote, histórico e renegociação
- [x] Alerta in-app no Layout (badge vermelho)
- [ ] Rodar migration no Supabase (SQL Editor)
- [ ] Testes e deploy
