# Planejamento de Melhorias — Parcerias Clínicas

Registro das melhorias planejadas, organizadas por bloco de prioridade.

---

## Bloco 1 — Integridade de Dados ✅ Em andamento

> Corrige problemas que podem causar dados errados silenciosamente no sistema financeiro.

### 1.1 Rateio dinâmico do banco
**Status:** ✅ Implementado (2026-09-07)  
**Relevância:** ⭐⭐⭐⭐⭐ — bug latente: alterações em Configurações não afetam o cálculo  
**Tokens est.:** ~8k

**Problema:**
O cálculo de rateio em `src/services/rateio.ts` usa percentuais hardcoded:
```typescript
const PERCENTUAIS = {
  A: { camta: 0.20, medico: 0, psi1: 0.30, psi2: 0.50 },
  B: { camta: 0, medico: 0.10, psi1: 0.40, psi2: 0.50 },
  C: { camta: 0, medico: 0, psi1: 0.40, psi2: 0.60 },
}
```
A tabela `parcerias` no banco tem os campos `camta_pct`, `medico_pct`, `psi1_pct`, `psi2_pct`, mas nunca são lidos no cálculo.

**Solução:**
- Criar hook `useParcerias()` que carrega os percentuais do banco
- Atualizar `calcularRateio()` para receber os percentuais dinamicamente
- Atualizar `Lancamentos.tsx` para passar os percentuais do banco ao criar/editar

**Arquivos impactados:**
- `src/services/rateio.ts`
- `src/services/lancamentos.ts`
- `src/hooks/useLancamentos.ts` (ou novo hook)
- `src/pages/Lancamentos.tsx`

---

### 1.2 Log de edições de lançamentos
**Status:** ✅ Implementado (2026-09-07)  
**Relevância:** ⭐⭐⭐⭐⭐ — auditoria essencial para sistema financeiro  
**Tokens est.:** ~10k

**Problema:**
Hoje existe log de exclusões (`lancamentos_log`), mas nenhuma rastreabilidade de edições. Não é possível saber quem alterou um valor, quando e por quê.

**Solução:**
- Migration: criar tabela `lancamentos_edicoes_log` (campos: lancamento_id, campo, valor_anterior, valor_novo, motivo, alterado_por, alterado_em)
- Atualizar `editarLancamento()` para comparar campos antes/depois e gravar log
- Adicionar modal "Histórico de Edições" na tela de Lançamentos (botão History por linha)

**Arquivos impactados:**
- Nova migration `012_lancamentos_edicoes_log.sql`
- `src/services/lancamentos.ts`
- `src/pages/Lancamentos.tsx`

---

### 1.3 Cancelamento com motivo e log
**Status:** ✅ Implementado (2026-09-07)  
**Relevância:** ⭐⭐⭐⭐ — fecha lacuna de auditoria (exclusão tem log, cancelamento não)  
**Tokens est.:** ~5k

**Problema:**
O cancelamento de lançamentos não exige motivo e não registra log. A exclusão em lote tem auditoria completa, mas o cancelamento é invisível.

**Solução:**
- Reutilizar tabela `lancamentos_log` (ou `lancamentos_edicoes_log` da 1.2) para registrar cancelamentos
- Adicionar modal de confirmação com campo motivo obrigatório ao cancelar
- Bloquear cancelamento de lançamentos já pagos

**Arquivos impactados:**
- `src/services/lancamentos.ts`
- `src/pages/Lancamentos.tsx`

---

## Bloco 2 — Experiência do Dia a Dia

> Pequenas melhorias de alto retorno e baixo custo de implementação.

### 2.1 Filtro por paciente em Parcelas
**Status:** ✅ Implementado (2026-09-07)  
**Relevância:** ⭐⭐⭐ | **Tokens est.:** ~2k  
Adicionar campo de busca por nome do paciente na tela de Parcelas.

### 2.2 Extrato com filtro de período
**Status:** ✅ Já estava implementado (identificado na revisão do Bloco 2)  
**Relevância:** ⭐⭐⭐ | **Tokens est.:** ~3k  
Adicionar `FiltroData` na tela de Extrato para o profissional filtrar por período.

### 2.3 Badge de repasses pendentes no menu
**Status:** ✅ Implementado (2026-09-07)  
**Relevância:** ⭐⭐⭐ | **Tokens est.:** ~2k  
Mostrar contagem de repasses não conciliados há mais de N dias no menu lateral.

---

## Bloco 3 — Novas Funcionalidades

> Features novas que agregam valor mas exigem mais esforço de implementação.

### 3.1 Dashboard de inadimplência
**Status:** ✅ Implementado (2026-09-07)  
**Relevância:** ⭐⭐⭐ | **Tokens est.:** ~12k  
Página `/inadimplencia` com pacientes inadimplentes agrupados, valor em aberto, dias de atraso, exportação PDF.

### 3.2 Relatório mensal consolidado de repasses
**Status:** ✅ Implementado (2026-09-07)  
**Relevância:** ⭐⭐ | **Tokens est.:** ~10k  
PDF/Excel com todos os repasses do mês agrupados por profissional. Disponível na tela de Relatórios.

### 3.3 Repasse vinculado à baixa da parcela
**Status:** ✅ Implementado (2026-09-07)  
**Relevância:** ⭐⭐⭐⭐ | **Tokens est.:** ~18k  
Migration 013: remove trigger de INSERT em lancamentos, cria trigger em parcelas (AFTER UPDATE status → 'pago'). Cria/acumula repasses proporcionalmente por parcela paga.

---

## Histórico de conclusão

| Data       | Feature                          | Bloco |
|------------|----------------------------------|-------|
| 2026-09-07 | Documentação do planejamento     | —     |
| 2026-09-07 | Rateio dinâmico do banco         | 1     |
| 2026-09-07 | Log de edições de lançamentos    | 1     |
| 2026-09-07 | Cancelamento com motivo e log    | 1     |
| 2026-09-07 | Filtro por paciente em Parcelas  | 2     |
| 2026-09-07 | Badge de repasses pendentes      | 2     |
| 2026-09-07 | Extrato com filtro de período    | 2     |
| 2026-09-07 | Dashboard de inadimplência       | 3     |
| 2026-09-07 | Relatório mensal de repasses     | 3     |
| 2026-09-07 | Repasse vinculado à baixa        | 3     |
