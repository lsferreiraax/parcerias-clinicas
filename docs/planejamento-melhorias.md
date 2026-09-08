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

---

## Bloco 4 — Comunicação e Automação

> Fecha o ciclo financeiro notificando os envolvidos nos momentos certos.

### 4.1 Notificação por e-mail ao conciliar repasse
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐⭐⭐ | **Tokens est.:** ~15k

**Problema:**
O profissional não sabe quando seu repasse foi conciliado. Precisa entrar no sistema e consultar o Extrato manualmente.

**Solução:**
- Supabase Edge Function `notificar-conciliacao` acionada via database webhook no UPDATE de `repasses` (status → conciliado)
- Busca e-mail do profissional correspondente ao `tipo` do repasse (camta/medico/psi1/psi2) em `user_profiles`
- Envia e-mail com valor, data e detalhes do atendimento via Resend ou Supabase Auth SMTP
- Configuração de e-mail por tipo de profissional em `configuracoes`

**Arquivos impactados:**
- Nova Edge Function `supabase/functions/notificar-conciliacao/index.ts`
- Migration: webhook para chamar a function
- `src/pages/Configuracoes.tsx` — campo de e-mail por profissional (se não vier de `user_profiles`)
- `docs/scripts-banco-de-dados.md`

---

### 4.2 Alerta de parcelas vencidas (cron)
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐⭐⭐ | **Tokens est.:** ~10k

**Problema:**
A migration `002_cron_notificar_vencidas.sql` já agenda um cron, mas a Edge Function que envia o e-mail ainda não existe — o cron dispara sem efeito.

**Solução:**
- Criar Edge Function `supabase/functions/alertar-vencidas/index.ts`
- Busca parcelas com `status = 'pendente'` e `data_vencimento < hoje`
- Envia e-mail para admin/gestor com lista de pacientes e valores
- Configurable: enviar apenas se houver vencidas (não spamear quando tudo em dia)

**Arquivos impactados:**
- Nova Edge Function `supabase/functions/alertar-vencidas/index.ts`
- Verificar e ajustar `supabase/migrations/002_cron_notificar_vencidas.sql`
- `docs/scripts-banco-de-dados.md`

---

### 4.3 Resumo mensal automático por e-mail
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐⭐ | **Tokens est.:** ~12k

**Problema:**
Admin e gestor precisam entrar no sistema para ver o consolidado do mês. Um e-mail automático no dia 1 traria visibilidade sem esforço.

**Solução:**
- Cron pg_cron todo dia 1 do mês às 7h
- Edge Function `supabase/functions/resumo-mensal/index.ts`
- Consolida: total de atendimentos, receita, parcelas vencidas, repasses pendentes do mês anterior
- Envia e-mail formatado para todos os usuários com role admin ou gestor

**Arquivos impactados:**
- Nova Edge Function `supabase/functions/resumo-mensal/index.ts`
- Migration: cron
- `docs/scripts-banco-de-dados.md`

---

## Bloco 5 — Qualidade de Dados

> Previne erros silenciosos antes que entrem no banco.

### 5.1 Validação de duplicata ao cadastrar lançamento
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐⭐⭐⭐ | **Tokens est.:** ~6k

**Problema:**
É possível cadastrar dois lançamentos para o mesmo paciente, na mesma data e parceria, sem nenhum aviso. Erros de duplo clique ou lançamento duplicado passam invisíveis.

**Solução:**
- Na tela de Lançamentos, ao preencher paciente + data + parceria, fazer query silenciosa ao banco
- Se encontrar lançamento similar (mesma data ±1 dia, mesmo paciente, mesma parceria), exibir alerta amarelo com link para o lançamento existente
- Não bloqueia o cadastro — apenas alerta (gestor pode ter motivo)
- Constraint `UNIQUE (paciente, data_atendimento, parceria_id)` opcional no banco (decisão do usuário)

**Arquivos impactados:**
- `src/pages/Lancamentos.tsx` — lógica de detecção + alerta visual
- `src/services/lancamentos.ts` — função `verificarDuplicata()`

---

### 5.2 Conferência de integridade do rateio
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐⭐⭐ | **Tokens est.:** ~4k

**Problema:**
Se os percentuais em `parcerias` não somam 100%, o rateio calculado difere do valor total sem nenhum aviso. O erro aparece silenciosamente nas parcelas.

**Solução:**
- No formulário de Lançamentos, ao calcular o rateio, verificar se `|camta+medico+psi1+psi2 - valor_total| > 0.02`
- Se sim, exibir badge vermelho "Rateio inconsistente" com os valores calculados e a diferença
- Em Configurações, avisar quando os percentuais de uma parceria não somam 100%

**Arquivos impactados:**
- `src/pages/Lancamentos.tsx` — verificação antes de salvar
- `src/pages/Configuracoes.tsx` — aviso de percentuais inválidos
- `src/services/rateio.ts` — função `validarRateio()`

---

### 5.3 Importação em lote via Excel
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐⭐ | **Tokens est.:** ~25k

**Problema:**
Cadastrar muitos atendimentos manualmente é lento. Clínicas frequentemente têm planilhas de controle que precisariam ser importadas.

**Solução:**
- Upload de arquivo `.xlsx` na tela de Lançamentos (botão "Importar")
- Template para download com colunas esperadas
- Validação linha a linha antes de salvar: erros marcados em vermelho, linhas válidas em verde
- Preview da importação antes de confirmar
- Salva em lote usando `supabase.from('lancamentos').insert(linhas)`

**Arquivos impactados:**
- `src/pages/Lancamentos.tsx` — modal de importação
- `src/services/lancamentos.ts` — `importarEmLote()`
- `src/components/lancamentos/ImportacaoModal.tsx` (novo)

---

## Bloco 6 — Experiência do Profissional

> Melhora o que o profissional vê e pode fazer no sistema.

### 6.1 Extrato com gráfico de evolução
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐⭐ | **Tokens est.:** ~10k

**Problema:**
O Extrato mostra uma lista plana de repasses. O profissional não tem visão de tendência — se está recebendo mais ou menos ao longo dos meses.

**Solução:**
- Adicionar seção de gráfico no topo da tela de Extrato (visível apenas para profissional)
- LineChart com evolução mensal dos repasses dos últimos 12 meses
- KPIs: total recebido no mês, média mensal, melhor mês

**Arquivos impactados:**
- `src/pages/Extrato.tsx`
- `src/hooks/useExtrato.ts` (novo hook para dados históricos)
- `src/services/extrato.ts` — nova query agrupada por mês

---

### 6.2 Comprovante de repasse em PDF
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐⭐ | **Tokens est.:** ~8k

**Problema:**
O profissional não tem como gerar comprovante do próprio repasse. Precisa pedir para o gestor.

**Solução:**
- Botão "Gerar comprovante" por linha no Extrato (visível para profissional)
- PDF individual com dados do atendimento, valor do repasse, data de conciliação e assinatura do sistema
- Reutiliza a infra de `relatorio.ts` (logo, cabeçalho, rodapé)

**Arquivos impactados:**
- `src/pages/Extrato.tsx` — botão por linha
- `src/services/relatorio.ts` — `gerarComprovante(repasse, usuarioNome)`

---

### 6.3 Histórico de renegociações
**Status:** 📋 Planejado  
**Relevância:** ⭐⭐ | **Tokens est.:** ~5k

**Problema:**
Não há um painel centralizado mostrando todas as parcelas renegociadas. A informação está espalhada na tela de Parcelas com filtro manual.

**Solução:**
- Aba "Renegociadas" na tela de Parcelas (ao lado dos filtros existentes)
- Tabela com: paciente, parcela original, novo vencimento, observações, data da renegociação
- Exportação PDF

**Arquivos impactados:**
- `src/pages/Parcelas.tsx` — filtro renegociada já existe; adicionar aba dedicada
- `src/services/relatorio.ts` — `gerarRelatorioRenegociacoes()`

---

## Resumo de prioridade — Próximos blocos

| Item | Relevância | Esforço (tokens) | Recomendação |
|------|-----------|-----------------|--------------|
| 5.1 Duplicata        | ⭐⭐⭐⭐⭐ | ~6k   | **Implementar primeiro** |
| 5.2 Integridade rateio | ⭐⭐⭐⭐ | ~4k   | **Implementar junto com 5.1** |
| 6.2 Comprovante PDF  | ⭐⭐⭐   | ~8k   | Rápido, alto valor percebido |
| 4.2 Alerta vencidas  | ⭐⭐⭐⭐ | ~10k  | Depende de SMTP configurado |
| 4.1 Notif. conciliação | ⭐⭐⭐⭐ | ~15k  | Depende de SMTP configurado |
| 6.1 Gráfico extrato  | ⭐⭐⭐   | ~10k  | Melhoria de UX do profissional |
| 4.3 Resumo mensal    | ⭐⭐⭐   | ~12k  | Depende de SMTP configurado |
| 5.3 Importação Excel | ⭐⭐⭐   | ~25k  | Maior esforço do bloco |
| 6.3 Renegociações    | ⭐⭐    | ~5k   | Menor prioridade |

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
