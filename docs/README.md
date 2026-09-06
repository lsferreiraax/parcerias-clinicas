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

---

## Features Planejadas (Backlog)

Ordenadas por impacto sugerido de implementação:

| # | Documento | Descrição resumida | Complexidade |
|---|-----------|-------------------|--------------|
| 1 | [feature-configuracoes.md](feature-configuracoes.md) | Painel Admin para gerenciar parcerias, profissionais e dados da clínica sem tocar no banco | Média |
| 2 | [feature-gestao-parcelas.md](feature-gestao-parcelas.md) | Baixa em lote, audit log de alterações, alertas in-app e renegociação de parcelas | Média |
| 3 | [feature-dashboard-avancado.md](feature-dashboard-avancado.md) | Gráficos de receita mensal, inadimplência e ranking de profissionais com Recharts | Média |
| 4 | [feature-relatorios-pdf.md](feature-relatorios-pdf.md) | Extrato individual e relatório de rateio em PDF com identidade visual da clínica | Média |
| 5 | [feature-app-mobile.md](feature-app-mobile.md) | PWA instalável com suporte offline e notificações push no celular | Alta |

---

## Convenções

- Toda migration SQL deve ser documentada em `scripts-banco-de-dados.md`
- Toda Edge Function deve ter seção própria em `scripts-banco-de-dados.md`
- Todo novo arquivo de feature deve listar: motivação, modelo de dados, arquivos afetados e critérios de aceite
