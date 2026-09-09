# Histórico de Features — Parcerias Clínicas

Registro cronológico de todas as funcionalidades implementadas no sistema.

---

## Fase 1 — Base do sistema

### Schema e autenticação
- Tabelas base: `parcerias`, `lancamentos`, `parcelas`, `perfis`
- Autenticação via Supabase Auth
- RBAC com 3 roles: `admin`, `gestor`, `profissional`
- Função `get_my_role()` com SECURITY DEFINER para evitar recursão no RLS
- RLS habilitado em todas as tabelas

### Telas iniciais
- **Dashboard** — KPIs e gráficos de atendimentos e receita
- **Lançamentos** — CRUD de atendimentos com cálculo de rateio automático
- **Parcelas** — visualização e baixa de parcelas de pagamento
- **Resumo** — consolidado financeiro por parceria e profissional
- **Extrato** — visão do profissional sobre seus atendimentos
- **Usuários** — gerenciamento de usuários (admin only)
- **Configurações** — configuração das parcerias (admin only)

---

## Fase 2 — Melhorias em Lançamentos

### Campo: Nome do Responsável
- Novo campo `nome_responsavel` na tabela `lancamentos` (migration 007)
- Tooltip com ícone "i" exibe o nome ao passar o mouse sobre o lançamento
- Campo disponível nos modais de criação e edição

### Campo: Data de Pagamento
- Novo campo `data_pagamento` na tabela `lancamentos` (migration 007)
- Registra a data em que o paciente efetuou o pagamento da sessão
- Exibido na tabela de lançamentos e nos modais

### Meio de Pagamento (multi-seleção)
- Novo campo `meio_pagamento TEXT[]` na tabela `lancamentos` (migration 008)
- Checkboxes: Cartão de Crédito, Pix, Dinheiro
- Lançamentos já pagos têm os checkboxes desabilitados (somente leitura)
- Exibição na tabela via badges coloridos por tipo

---

## Fase 3 — Favicon e Identidade Visual

### Favicon com logotipo
- Favicon atualizado para usar o logotipo real da clínica (`logotipo/logo-elleve.jpeg`)
- Arquivo copiado para `public/logo.jpeg`
- `index.html` atualizado: `<link rel="icon" type="image/jpeg" href="/logo.jpeg" />`

---

## Fase 4 — Relatórios PDF

### Tela de Relatórios (`/relatorios`)
- Geração de relatórios em PDF com `jsPDF` + `jspdf-autotable`
- Cabeçalho com logotipo da clínica
- Rodapé com mensagem de acesso restrito em todas as páginas
- Exportação para Excel via `XLSX`
- Acesso restrito a roles `admin` e `gestor`

---

## Fase 5 — Exclusão em Lote de Lançamentos

### Multi-seleção com exclusão em lote
- Checkboxes de seleção na tabela de Lançamentos
- Botão "Excluir selecionados (N)" habilitado ao selecionar ao menos um
- **Regras de negócio:**
  - Lançamentos com `status = 'pago'` não podem ser excluídos (checkbox desabilitado)
  - Apenas roles `admin` e `gestor` têm acesso ao botão de exclusão
  - Campo de motivo obrigatório (mínimo de caracteres exigido)
- **Auditoria:** cada exclusão grava registro em `lancamentos_log` com paciente, parceria, valor, motivo e usuário
- **Cascade:** ao excluir lançamento, suas parcelas são removidas automaticamente (`ON DELETE CASCADE`, migration 009)

---

## Fase 6 — Correção do Resumo (double-counting + cancelados)

### Bugs corrigidos (migration 010)

**Bug 1 — Double-counting:**
- As views `resumo_por_parceria` e `resumo_profissional` faziam `JOIN lancamentos + parcelas`
- Lançamentos parcelados tinham seus valores somados múltiplas vezes (uma por parcela)
- **Fix:** removido o JOIN com parcelas — os valores de rateio já estão em `lancamentos`

**Bug 2 — Cancelados nos totais:**
- Lançamentos com `status = 'cancelado'` eram contabilizados nos KPIs e nas views
- **Fix:** adicionado `WHERE status != 'cancelado'` em todas as queries de totais

**Arquivos alterados:** `resumo.ts` (serviço), `resumo_por_parceria` e `resumo_profissional` (views SQL)

---

## Fase 7 — Repasses

### Feature completa de controle de repasses financeiros

**Objetivo:** Controlar o pagamento (repasse) feito pela clínica a cada profissional (Médico, Camta, Psi1, Psi2) referente aos atendimentos realizados.

#### Banco de dados (migration 011)
- Tabela `repasses` com campos: `lancamento_id`, `tipo`, `valor_original`, `valor_repasse`, `status`, `data_repasse`
- Tabela `repasses_log` para auditoria de alterações
- Trigger `repasses_apos_lancamento` — cria repasses automaticamente ao inserir lançamento
- Trigger `repasses_apos_edicao_lancamento` — atualiza repasses não conciliados ao editar lançamento
- INSERTs retroativos para lançamentos já existentes

#### Tela de Repasses (`/repasses`)
- Abas por profissional: Médico, Camta, Psi1, Psi2
- **Filtros:** paciente, situação (conciliado / não conciliado), período de atendimento, data do repasse
- **KPIs por aba:** Total, Conciliado, Não Conciliado
- **Tabela:** data de atendimento, paciente, parceria, data de pagamento, valor original, valor de repasse, data do repasse, situação
- **Ações por linha:**
  - Conciliar (define data do repasse)
  - Desfazer conciliação (requer motivo)
  - Editar valor (requer motivo, registrado em log)
  - Ver histórico de alterações
- **Conciliação em lote:** seleção múltipla de repasses não conciliados
- Exportação para **PDF** e **Excel**
- Acesso restrito a roles `admin` e `gestor`

#### Bug corrigido: filtros de data não funcionavam
- **Causa:** Supabase PostgREST não suporta filtrar em colunas de tabelas relacionadas via join embutido (`.gte('lancamentos.data_atendimento', ...)` era ignorado silenciosamente)
- **Fix:** filtros de `dataInicio` e `dataFim` (por `data_atendimento`) movidos para filtragem client-side após busca dos dados, consistente com o filtro de `paciente`
- **Arquivo:** `src/services/repasses.ts`

---

## Fase 8 — Dashboard de Inadimplência

### Tela de Inadimplência (`/inadimplencia`)
- KPIs: total de pacientes inadimplentes, valor total em aberto, ticket médio, maior devedor
- Tabela agrupada por paciente com expand/collapse (parcelas em atraso por paciente)
- Badge de severidade por dias de atraso: leve (até 30d), moderado (31–90d), crítico (90d+)
- Ordenação e filtros por parceria, severidade e período
- Exportação em PDF
- Acesso restrito a roles `admin` e `gestor`
- Rota `/inadimplencia` com `RoleGuard`

---

## Fase 9 — Relatório Mensal de Repasses

### Novo relatório na tela de Relatórios
- Seletor de mês/ano para escolher o período de referência
- Exportação em **PDF** (por profissional, com subtotais) e **Excel** (aba resumo + aba por profissional)
- Mapa de tipo: `{ camta: 'Camta', medico: 'Médico', psi1: 'Psi 1', psi2: 'Psi 2' }`
- Funções: `gerarRelatorioMensalRepasses()` e `exportarRepassesMensalExcel()` em `src/services/relatorio.ts`

---

## Fase 10 — Repasse Vinculado à Baixa da Parcela (migration 013)

### Mudança de lógica de geração de repasses
- **Antes:** trigger em `lancamentos` (INSERT) criava repasses pelo valor total do lançamento
- **Depois:** trigger em `parcelas` (AFTER UPDATE) dispara quando `status → 'pago'`
- Calcula proporção: `valor_parcela / valor_total` e cria/acumula repasses por tipo
- Usa `INSERT ON CONFLICT DO UPDATE` para acumular em repasse já existente (não conciliado)

---

## Fase 11 — Detecção de Duplicata e Validação de Rateio (US-19 e US-20)

### Detecção de lançamento duplicado (US-19)
- Ao preencher paciente + data + parceria, query silenciosa busca lançamentos similares (±1 dia, mesmo paciente, mesma parceria, status ≠ cancelado)
- Exibe alerta amarelo com dados do lançamento existente
- Não bloqueia o cadastro — apenas alerta
- Hook `useVerificarDuplicata()` em `src/hooks/useLancamentos.ts`; função `verificarDuplicata()` em `src/services/lancamentos.ts`

### Validação de integridade do rateio (US-20)
- Badge de alerta no formulário de lançamento quando `|soma_rateio - valor_total| > 0.02`
- Função `validarResultadoRateio()` em `src/services/rateio.ts`
- Coluna "Soma %" na tela de Configurações → Parcerias com `✓` ou `⚠` por parceria

---

## Fase 12 — Bug Fix: Percentuais de Rateio (migration 014)

### Problema
O DB armazena percentuais como inteiros (`40` = 40%), mas `calcularRateio()` multiplicava diretamente sem dividir por 100, gerando valores 100× maiores (ex: R$ 2.500 × 40 = R$ 100.000).

Adicionalmente, a Parceria C foi editada via UI com valores fracionários (0.4 / 0.6) ao invés de inteiros (40 / 60).

### Correções aplicadas
- **`src/services/rateio.ts`:** `calcularRateio` divide por 100; `validarRateio` verifica `soma ≈ 100` (não mais ≈ 1)
- **`src/components/config/GerenciarParcerias.tsx`:** `BadgeSoma` passa inteiros diretos ao `validarRateio`
- **Migration 014:** corrige Parceria C (`psi1_pct = 40`, `psi2_pct = 60`); recalcula `lancamentos`, `parcelas` e `repasses` não conciliados com a fórmula correta `valor * pct / 100`

---

## Fase 13 — Busca por Paciente em Lançamentos

### Campo de busca na barra de filtros
- Input com ícone de lupa adicionado à barra de filtros de Lançamentos
- Filtragem client-side instantânea (case-insensitive) sobre o array já carregado
- Não gera nova requisição ao banco — consistente com os demais filtros do projeto
- **Arquivo:** `src/pages/Lancamentos.tsx`

---

## Fase 14 — Responsividade Mobile (M1, M2, M3)

### M1 — Sidebar responsiva com drawer
- Em desktop (`md+`): sidebar fixa de 256px mantida
- Em mobile (`< md`): sidebar oculta; botão hambúrguer no header abre drawer deslizante de 288px
- Overlay escuro fecha o drawer ao toque; navegação também fecha automaticamente
- Scroll do body bloqueado enquanto o drawer está aberto
- **Arquivo:** `src/components/layout/Layout.tsx`

### M2 — Padding e layout adaptativo
- Conteúdo principal: `p-4 md:p-8` (era `p-8` fixo)
- Header: `px-4 md:px-8` e `py-3 md:py-4`
- Barras de filtro: `px-4 md:px-6` em todas as páginas de tabela
- Formulários de lançamento: `grid-cols-1 sm:grid-cols-2` (eram `grid-cols-2` fixo)
- **Arquivos:** `Layout.tsx`, `Lancamentos.tsx`, `Parcelas.tsx`, `Repasses.tsx`, `Inadimplencia.tsx`

### M3 — Versão card para tabelas em mobile
- Todas as tabelas com muitas colunas ganham versão card em mobile (`md:hidden`), mantendo a tabela em desktop (`hidden md:block`)
- **Lançamentos:** card com status, badges de parceria/forma/meio, valor em destaque, rateio em grid 4 colunas, botões rotulados
- **Parcelas:** checkbox de seleção, grid 3 colunas (parcela/vencimento/valor), rateio colapsado, botões Baixar/Renegociar/Histórico
- **Repasses:** checkbox, valores original vs repasse com indicador ✎ de edição, botões Conciliar/Desfazer/Editar/Histórico
- **Inadimplência:** card expansível ao toque (expande lista de parcelas), badge de gravidade, valor em aberto em destaque
- **Arquivos:** `Lancamentos.tsx`, `Parcelas.tsx`, `Repasses.tsx`, `Inadimplencia.tsx`

---

## Fase 17 — Painel de Renegociações (6.3)

### Aba dedicada em Parcelas
- Nova aba "Renegociadas" com contagem ao lado do label; alterna o conteúdo do card principal sem perder os filtros da aba Parcelas
- KPI de Renegociadas adicionado ao grid de 4 colunas no topo da página
- Tabela dedicada desktop: Paciente, Parceria, Parcela, Novo Vencimento, Valor, Data Renegociação, Motivo — visual âmbar
- Versão card mobile com mesmo conjunto de informações
- Botão "Exportar PDF" visível apenas na aba Renegociadas (admin/gestor)
- **`src/services/parcelas.ts`:** `listarRenegociadas()` — busca parcelas `status='renegociada'` + `parcelas_log` em paralelo para obter data exata de renegociação; combina client-side
- **`src/services/relatorio.ts`:** `gerarRelatorioRenegociacoes()` — PDF A4 portrait com rodapé padrão
- **`src/hooks/useResumo.ts`:** `useRenegociadas()`
- **`src/pages/Parcelas.tsx`:** abas + tabela dedicada + exportação

---

## Fase 16 — Gráfico de Evolução Mensal no Extrato (6.1)

### LineChart dos últimos 12 meses por profissional
- Exibido entre os KPIs e a tabela na tela de Extrato, visível quando há ao menos um mês com dados
- Cor da linha acompanha o profissional selecionado (azul/verde/amarelo/laranja)
- Linha tracejada cinza marca a média mensal; tooltip formata valores em BRL
- KPIs extras no cabeçalho do card: **Média mensal** e **Melhor mês**
- Meses sem atendimentos aparecem com valor zero, mantendo a continuidade visual da série
- **`src/services/extrato.ts`:** nova função `getExtratoMensal()` — busca, agrupa por `YYYY-MM` e preenche os 12 meses
- **`src/hooks/useExtrato.ts`:** novo hook `useExtratoMensal()` com staleTime de 5 min
- **`src/pages/Extrato.tsx`:** componente LineChart (Recharts) responsivo, altura 220px

---

## Fase 15 — Comprovante de Repasse em PDF (6.2)

### Geração de comprovante individual por lançamento
- Botão "Comprovante" com ícone `FileText` em cada linha da tabela do Extrato
- Disponível para todos os perfis (admin, gestor, profissional)
- PDF portrait A4 com o mesmo padrão visual dos demais relatórios (logo, faixa azul, rodapé)
- Caixa de dados: paciente, data do atendimento, parceria, forma de pagamento, status e profissional
- Dois blocos de destaque lado a lado: **Valor Total do Atendimento** e **Valor do Repasse** do profissional selecionado
- Nome do arquivo: `comprovante_{profissional}_{paciente}_{data}.pdf`
- **Arquivos:** `src/services/relatorio.ts` (função `gerarComprovante()`), `src/pages/Extrato.tsx`

---

## Limitações conhecidas do Supabase PostgREST

> **Importante para desenvolvimento futuro:**
> 
> O Supabase PostgREST **não suporta filtrar em colunas de tabelas relacionadas** usando a sintaxe de join embutido. Por exemplo:
> ```typescript
> // NÃO funciona — filter em coluna da tabela join
> q.gte('lancamentos.data_atendimento', dataInicio)
> 
> // Funciona — filter em coluna da própria tabela
> q.gte('data_repasse', dataRepasseInicio)
> ```
> 
> **Solução:** buscar todos os dados e aplicar o filtro no cliente (JavaScript), como feito nos filtros de `paciente`, `dataInicio` e `dataFim` em `listarRepasses()`.
