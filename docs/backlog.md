# Backlog — Parcerias Clínicas

Documento consolidado de todas as melhorias planejadas, ordenadas por prioridade.
Atualizado em: 2026-09-08

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Implementado |
| 🔴 | Alta prioridade — bloqueador ou impacto direto na operação |
| 🟡 | Média prioridade — melhoria relevante sem urgência |
| 🟢 | Baixa prioridade — nice-to-have, qualidade de vida |
| 📋 | Planejado, aguardando implementação |

---

## Prioridade — Visão Rápida

| # | Item | Prioridade | Esforço | Status |
|---|------|-----------|---------|--------|
| M1 | Sidebar responsiva (hambúrguer/drawer) | 🔴 | ~10k | 📋 |
| M2 | Padding e layout adaptativo mobile | 🔴 | ~3k | 📋 |
| 6.2 | Comprovante de repasse em PDF | 🟡 | ~8k | 📋 |
| 4.2 | Alerta de parcelas vencidas por e-mail | 🟡 | ~10k | 📋 |
| 4.1 | Notificação por e-mail ao conciliar repasse | 🟡 | ~15k | 📋 |
| M3 | Tabelas mobile — versão card / scroll explícito | 🟡 | ~15k | 📋 |
| 6.1 | Gráfico de evolução no Extrato | 🟢 | ~10k | 📋 |
| 4.3 | Resumo mensal automático por e-mail | 🟢 | ~12k | 📋 |
| 5.3 | Importação em lote via Excel | 🟢 | ~25k | 📋 |
| 6.3 | Painel de renegociações | 🟢 | ~5k | 📋 |

---

## Bloco M — Responsividade Mobile

> Sem essas correções, o sistema não é utilizável em smartphones.

### M1 — Sidebar responsiva
**Status:** 📋 Planejado | **Prioridade:** 🔴 | **Tokens est.:** ~10k

**Problema:**
A sidebar fixa de 256px (`w-64`) ocupa 2/3 da tela em celulares (375–430px). Não há menu hambúrguer, drawer deslizante ou bottom navigation. O conteúdo principal fica com ~120px — inutilizável.

**Solução:**
- Abaixo de `md` (768px): esconder sidebar, exibir botão hambúrguer no topo
- Drawer deslizante da esquerda com overlay escuro ao abrir
- Fechar ao clicar em um item de navegação ou no overlay
- Alternativa: bottom navigation bar fixa com ícones (mais nativo em mobile)

**Arquivos impactados:**
- `src/components/layout/Layout.tsx`
- Possível novo componente `src/components/layout/MobileNav.tsx`

---

### M2 — Padding e layout adaptativo
**Status:** 📋 Planejado | **Prioridade:** 🔴 | **Tokens est.:** ~3k

**Problema:**
O conteúdo principal usa `p-8` (32px) fixo. Em tela de 375px resta apenas ~311px úteis. A barra de filtros com `flex-wrap` empilha de forma desorganizada.

**Solução:**
- Trocar `p-8` por `p-4 md:p-8` no `<main>`
- Ajustar barra de filtros para empilhar verticalmente em mobile com melhor espaçamento
- Revisar `grid-cols-2` em formulários — usar `sm:grid-cols-2` para quebrar em tela menor

**Arquivos impactados:**
- `src/components/layout/Layout.tsx`
- `src/pages/Lancamentos.tsx`, `Parcelas.tsx`, `Repasses.tsx`

---

### M3 — Tabelas em mobile
**Status:** 📋 Planejado | **Prioridade:** 🟡 | **Tokens est.:** ~15k

**Problema:**
Tabelas com 12–14 colunas (Lançamentos, Parcelas, Repasses, Inadimplência) exigem scroll horizontal dentro da tabela em mobile. Difícil de usar com toque.

**Solução:**
- Abaixo de `md`: substituir `<table>` por lista de cards (cada linha vira um card empilhado com os campos mais relevantes)
- Campos secundários (Camta, Médico, Psi1, Psi2) colapsáveis por expansão de card
- Manter `<table>` em desktop sem alteração

**Arquivos impactados:**
- `src/pages/Lancamentos.tsx`
- `src/pages/Parcelas.tsx`
- `src/pages/Repasses.tsx`
- `src/pages/Inadimplencia.tsx`

---

## Bloco 4 — Comunicação e Automação

> Fecha o ciclo financeiro notificando os envolvidos nos momentos certos. Depende de SMTP configurado (Resend ou Supabase Auth SMTP).

### 4.1 — Notificação por e-mail ao conciliar repasse
**Status:** 📋 Planejado | **Prioridade:** 🟡 | **Tokens est.:** ~15k

**Problema:**
O profissional não sabe quando seu repasse foi conciliado. Precisa entrar no sistema e consultar o Extrato manualmente.

**Solução:**
- Edge Function `notificar-conciliacao` acionada via database webhook no UPDATE de `repasses` (status → conciliado)
- Busca e-mail do profissional correspondente ao `tipo` (camta/medico/psi1/psi2) em `perfis`
- Envia e-mail com valor, data e detalhes do atendimento

**Arquivos impactados:**
- Nova Edge Function `supabase/functions/notificar-conciliacao/index.ts`
- Migration: webhook
- `src/pages/Configuracoes.tsx` — campo de e-mail por profissional

---

### 4.2 — Alerta de parcelas vencidas (cron)
**Status:** 📋 Planejado | **Prioridade:** 🟡 | **Tokens est.:** ~10k

**Problema:**
O cron `002_cron_notificar_vencidas.sql` já está agendado, mas a Edge Function que envia o e-mail não existe — o cron dispara sem efeito.

**Solução:**
- Edge Function `supabase/functions/alertar-vencidas/index.ts`
- Busca parcelas `status = 'pendente'` e `data_vencimento < hoje`
- Envia e-mail para admin/gestor com lista de pacientes e valores
- Envia apenas se houver vencidas (sem spam quando tudo em dia)

**Arquivos impactados:**
- Nova Edge Function `supabase/functions/alertar-vencidas/index.ts`
- `supabase/migrations/002_cron_notificar_vencidas.sql` — verificar

---

### 4.3 — Resumo mensal automático por e-mail
**Status:** 📋 Planejado | **Prioridade:** 🟢 | **Tokens est.:** ~12k

**Problema:**
Admin e gestor precisam entrar no sistema para ver o consolidado do mês.

**Solução:**
- Cron pg_cron todo dia 1 do mês às 7h
- Edge Function `supabase/functions/resumo-mensal/index.ts`
- Consolida: atendimentos, receita, parcelas vencidas, repasses pendentes do mês anterior
- Envia para todos os usuários com role admin ou gestor

**Arquivos impactados:**
- Nova Edge Function `supabase/functions/resumo-mensal/index.ts`
- Migration: cron

---

## Bloco 5 — Qualidade de Dados

### 5.1 — Detecção de lançamento duplicado
**Status:** ✅ Implementado (2026-09-08)

### 5.2 — Validação de integridade do rateio
**Status:** ✅ Implementado (2026-09-08)

### 5.3 — Importação em lote via Excel
**Status:** 📋 Planejado | **Prioridade:** 🟢 | **Tokens est.:** ~25k

**Problema:**
Cadastrar muitos atendimentos manualmente é lento. Clínicas frequentemente têm planilhas de controle.

**Solução:**
- Upload de `.xlsx` na tela de Lançamentos (botão "Importar")
- Template para download com colunas esperadas
- Validação linha a linha: erros em vermelho, válidas em verde
- Preview antes de confirmar
- Salva em lote via `supabase.from('lancamentos').insert(linhas)`

**Arquivos impactados:**
- `src/pages/Lancamentos.tsx` — modal de importação
- `src/services/lancamentos.ts` — `importarEmLote()`
- Novo componente `src/components/lancamentos/ImportacaoModal.tsx`

---

## Bloco 6 — Experiência do Profissional

### 6.1 — Gráfico de evolução no Extrato
**Status:** 📋 Planejado | **Prioridade:** 🟢 | **Tokens est.:** ~10k

**Problema:**
O Extrato mostra lista plana. O profissional não tem visão de tendência mensal.

**Solução:**
- LineChart no topo do Extrato (apenas para role profissional)
- Evolução mensal dos repasses dos últimos 12 meses
- KPIs: total no mês, média mensal, melhor mês

**Arquivos impactados:**
- `src/pages/Extrato.tsx`
- Novo hook `src/hooks/useExtrato.ts`

---

### 6.2 — Comprovante de repasse em PDF
**Status:** 📋 Planejado | **Prioridade:** 🟡 | **Tokens est.:** ~8k

**Problema:**
O profissional não pode gerar comprovante do próprio repasse. Precisa pedir ao gestor.

**Solução:**
- Botão "Gerar comprovante" por linha no Extrato (visível ao profissional)
- PDF individual com dados do atendimento, valor do repasse, data de conciliação
- Reutiliza infra de `relatorio.ts` (logo, cabeçalho, rodapé)

**Arquivos impactados:**
- `src/pages/Extrato.tsx`
- `src/services/relatorio.ts` — `gerarComprovante(repasse, usuarioNome)`

---

### 6.3 — Painel de renegociações
**Status:** 📋 Planejado | **Prioridade:** 🟢 | **Tokens est.:** ~5k

**Problema:**
Não há painel centralizado mostrando parcelas renegociadas. A informação está espalhada na tela de Parcelas.

**Solução:**
- Aba "Renegociadas" na tela de Parcelas
- Tabela: paciente, parcela original, novo vencimento, observações, data da renegociação
- Exportação PDF

**Arquivos impactados:**
- `src/pages/Parcelas.tsx`
- `src/services/relatorio.ts` — `gerarRelatorioRenegociacoes()`

---

## Itens concluídos (referência)

| Data | Feature | Bloco |
|------|---------|-------|
| 2026-09-07 | Rateio dinâmico do banco | 1 |
| 2026-09-07 | Log de edições de lançamentos | 1 |
| 2026-09-07 | Cancelamento com motivo e log | 1 |
| 2026-09-07 | Filtro por paciente em Parcelas | 2 |
| 2026-09-07 | Badge de repasses pendentes no menu | 2 |
| 2026-09-07 | Extrato com filtro de período | 2 |
| 2026-09-07 | Dashboard de inadimplência | 3 |
| 2026-09-07 | Relatório mensal de repasses (PDF + Excel) | 3 |
| 2026-09-07 | Repasse vinculado à baixa da parcela | 3 |
| 2026-09-08 | Detecção de lançamento duplicado | 5 |
| 2026-09-08 | Validação de integridade do rateio | 5 |
| 2026-09-08 | Bug fix: percentuais de rateio ÷ 100 | — |
| 2026-09-08 | Busca por paciente em Lançamentos | — |
