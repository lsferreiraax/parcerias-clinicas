# Documentação — Parcerias Clínicas

Índice de toda a documentação técnica e de features do projeto.

---

## Backlog e Planejamento

| Documento | Descrição |
|-----------|-----------|
| [backlog.md](backlog.md) | Backlog consolidado com todos os itens planejados, priorizados e estimados |
| [planejamento-melhorias.md](planejamento-melhorias.md) | Detalhamento técnico dos blocos de melhoria (histórico) |
| [estorias-de-negocio.md](estorias-de-negocio.md) | 24 user stories com critérios de aceitação |

---

## Scripts & Banco de Dados

| Documento | Descrição |
|-----------|-----------|
| [scripts-banco-de-dados.md](scripts-banco-de-dados.md) | Todas as migrations SQL e Edge Functions, com código completo e instruções de execução |

---

## Features Implementadas

| Documento | Status |
|-----------|--------|
| [feature-perfis-acesso.md](feature-perfis-acesso.md) | ✅ Implementada — RBAC com 3 perfis (Admin, Gestor, Profissional), RLS no Supabase |
| [feature-configuracoes.md](feature-configuracoes.md) | ✅ Implementada — Painel Admin com abas: Dados da Clínica, Parcerias, Profissionais, Notificações |
| [feature-gestao-parcelas.md](feature-gestao-parcelas.md) | ✅ Implementada — Baixa em lote, histórico/audit log, renegociação, badge de alerta |
| [feature-dashboard-avancado.md](feature-dashboard-avancado.md) | ✅ Implementada — Gráficos 12 meses, KPIs comparativos, ranking de profissionais |
| [feature-relatorios-pdf.md](feature-relatorios-pdf.md) | ✅ Implementada — 3 relatórios PDF com logo, cabeçalho e rodapé de acesso restrito |

---

## Features Planejadas (Backlog)

| # | Documento | Descrição resumida | Complexidade |
|---|-----------|-------------------|--------------|
| 1 | [feature-app-mobile.md](feature-app-mobile.md) | PWA instalável com suporte offline e notificações push no celular | Alta |

---

## Melhorias e Correções (sem feature doc próprio)

| Data | Descrição |
|------|-----------|
| 07/09/2026 | **Lançamentos — campos extras:** `nome_responsavel`, `data_pagamento` e tooltip com ícone (i) na tabela (migration 007) |
| 07/09/2026 | **Lançamentos — meio de pagamento:** checkboxes multi-seleção (Cartão de Crédito, Pix, Dinheiro), coluna na tabela (migration 008) |
| 07/09/2026 | **Login:** botão mostrar/ocultar senha |
| 07/09/2026 | **Favicon:** logotipo da clínica (`public/logo.jpeg`) |
| 07/09/2026 | **Edição de lançamentos:** recalcula rateio das parcelas pendentes ao editar parceria ou valor |
| 07/09/2026 | **Backup automático:** Edge Function `backup-banco` + pg_cron diário às 03h BRT (migration 006) |
| 07/09/2026 | **Dashboard de inadimplência:** página `/inadimplencia` com KPIs, agrupamento por paciente e exportação PDF |
| 07/09/2026 | **Relatório mensal de repasses:** PDF e Excel por profissional na tela de Relatórios |
| 07/09/2026 | **Repasse por baixa de parcela:** migration 013 — repasses gerados proporcionalmente ao pagar cada parcela |
| 08/09/2026 | **Detecção de duplicata (US-19):** alerta amarelo ao cadastrar lançamento similar ao existente |
| 08/09/2026 | **Validação de rateio (US-20):** badge de inconsistência quando rateio não fecha com valor total |
| 08/09/2026 | **Bug fix — rateio 100× (migration 014):** corrigido cálculo que multiplicava percentual inteiro sem ÷ 100; dados de lancamentos, parcelas e repasses recalculados |
| 08/09/2026 | **Busca por paciente em Lançamentos:** campo de busca com ícone de lupa, filtragem client-side instantânea |
| 08/09/2026 | **M1 — Sidebar responsiva:** botão hambúrguer + drawer deslizante em mobile, overlay com fecho automático na navegação |
| 08/09/2026 | **M2 — Layout adaptativo:** padding `p-4 md:p-8`, formulários `sm:grid-cols-2`, barras de filtro responsivas |
| 08/09/2026 | **M3 — Tabelas mobile:** versão card para Lançamentos, Parcelas, Repasses e Inadimplência (abaixo de 768px) |
| 09/09/2026 | **Painel de renegociações (6.3):** aba dedicada em Parcelas com tabela, data exata de renegociação e exportação PDF |
| 09/09/2026 | **Gráfico de evolução mensal no Extrato (6.1):** LineChart Recharts com média, melhor mês e cor por profissional |
| 09/09/2026 | **Comprovante de repasse em PDF (6.2):** botão por linha no Extrato; PDF com dados do atendimento e valores em destaque |

---

## Convenções

- Toda migration SQL deve ser documentada em `scripts-banco-de-dados.md`
- Toda Edge Function deve ter seção própria em `scripts-banco-de-dados.md`
- Todo novo arquivo de feature deve listar: motivação, modelo de dados, arquivos afetados e critérios de aceite
