# Feature: Dashboard Avançado

## Visão Geral

Evolução do Dashboard atual para incluir gráficos interativos, KPIs comparativos e visão de tendências mensais, tornando a análise financeira mais visual e estratégica.

---

## Motivação

O Dashboard atual exibe valores totais estáticos. Gestores e Admins precisam enxergar **evolução ao longo do tempo**, comparar meses e identificar tendências de inadimplência ou crescimento.

---

## Funcionalidades

### 1. Gráfico de Receita Mensal
- Barras agrupadas por mês (últimos 12 meses)
- Breakdown por parceria (A, B, C)
- Linha de tendência

### 2. Gráfico de Inadimplência
- Parcelas vencidas vs. pagas por mês
- Taxa de inadimplência (%) em linha secundária

### 3. KPIs Comparativos
| KPI | Lógica |
|-----|--------|
| Receita do mês | vs. mês anterior (↑↓ %) |
| Ticket médio | valor médio por atendimento |
| Parcelas em aberto | quantidade e valor total |
| Profissional com maior volume | ranking do mês |

### 4. Ranking de Profissionais
- Cards com foto/inicial, nome, total recebido no mês
- Ordenado por volume

### 5. Filtro de Período Global
- Seletor de mês/ano no topo do Dashboard
- Todos os KPIs e gráficos respondem ao filtro

---

## Tecnologia

| Componente | Biblioteca |
|------------|-----------|
| Gráficos | [Recharts](https://recharts.org) (já compatível com React/Tailwind) |
| Dados | React Query — queries com agregação por mês no Supabase |
| Exportar | PNG via `html2canvas` ou PDF via `jsPDF` |

---

## Modelo de Dados

Nenhuma nova tabela necessária. As queries usam as tabelas `lancamentos` e `parcelas` existentes com `GROUP BY DATE_TRUNC('month', data_atendimento)`.

Query base:
```sql
SELECT
  DATE_TRUNC('month', data_atendimento) AS mes,
  parceria_id,
  SUM(valor_total) AS receita,
  COUNT(*) AS atendimentos
FROM lancamentos
WHERE data_atendimento BETWEEN :inicio AND :fim
GROUP BY 1, 2
ORDER BY 1;
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Dashboard.tsx` | Substituir KPIs simples por layout com gráficos |
| `src/components/charts/ReceitaMensal.tsx` | Novo — gráfico de barras Recharts |
| `src/components/charts/Inadimplencia.tsx` | Novo — gráfico de linhas |
| `src/components/charts/RankingProfissionais.tsx` | Novo — cards de ranking |
| `src/services/dashboard.ts` | Novo — queries agregadas por mês |

---

## Critérios de Aceite

- [ ] Gráfico de receita exibe os últimos 12 meses corretamente
- [ ] KPIs mostram variação % em relação ao mês anterior
- [ ] Filtro de período atualiza todos os componentes simultaneamente
- [ ] Ranking ordena corretamente por volume do período selecionado
- [ ] Gráficos responsivos em telas menores (tablet)

---

## Status

- [ ] Documentação criada
- [ ] Instalar Recharts (`npm install recharts`)
- [ ] Implementar queries em `dashboard.ts`
- [ ] Implementar componentes de gráfico
- [ ] Atualizar página Dashboard
- [ ] Testes e deploy
