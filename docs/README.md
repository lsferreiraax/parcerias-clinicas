# Documentação — Parcerias Clínicas

Índice de toda a documentação técnica e de features do projeto.

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

## Melhorias Incrementais (sem feature doc próprio)

| Data | Descrição |
|------|-----------|
| 07/09/2026 | **Lançamentos — campos extras:** `nome_responsavel`, `data_pagamento` e tooltip com ícone (i) na tabela (migration 007) |
| 07/09/2026 | **Lançamentos — meio de pagamento:** checkboxes multi-seleção (Cartão de Crédito, Pix, Dinheiro), coluna na tabela (migration 008) |
| 07/09/2026 | **Login:** botão mostrar/ocultar senha |
| 07/09/2026 | **Favicon:** logotipo da clínica (`public/logo.jpeg`) |
| 07/09/2026 | **Edição de lançamentos:** recalcula rateio das parcelas pendentes ao editar parceria ou valor |
| 07/09/2026 | **Backup automático:** Edge Function `backup-banco` + pg_cron diário às 03h BRT (migration 006) |

---

## Convenções

- Toda migration SQL deve ser documentada em `scripts-banco-de-dados.md`
- Toda Edge Function deve ter seção própria em `scripts-banco-de-dados.md`
- Todo novo arquivo de feature deve listar: motivação, modelo de dados, arquivos afetados e critérios de aceite
