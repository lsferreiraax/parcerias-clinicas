# Feature: Relatórios em PDF

## Visão Geral

Geração de relatórios financeiros em PDF prontos para impressão ou envio: extrato individual por profissional, relatório mensal de rateio e relatório de inadimplência.

---

## Motivação

Os profissionais e gestores precisam de documentos formais para controle financeiro, prestação de contas e registros contábeis. O Excel atual não tem formatação profissional nem identidade visual da clínica.

---

## Relatórios Planejados

### 1. Extrato Individual (por profissional)
- Período selecionável
- Cabeçalho com logo/nome da clínica e dados do profissional
- Tabela de lançamentos com: data, paciente, parceria, valor bruto, valor do profissional
- Resumo: total de atendimentos, total a receber, total recebido, saldo pendente
- Rodapé com data de geração e assinatura digital (nome do usuário logado)

### 2. Relatório Mensal de Rateio
- Visão consolidada por parceria e por profissional
- Comparativo com mês anterior
- Gráfico de pizza de distribuição (renderizado no canvas, embutido no PDF)

### 3. Relatório de Inadimplência
- Lista de parcelas vencidas e não pagas
- Agrupado por paciente
- Valor total em aberto

---

## Tecnologia

| Solução | Prós | Contras |
|---------|------|---------|
| **jsPDF + autoTable** | Leve, client-side, sem servidor | Layout limitado, gráficos manuais |
| **React-pdf (renderização)** | JSX declarativo, design rico | Bundle grande (~500KB) |
| **Puppeteer (server-side)** | HTML → PDF perfeito, gráficos reais | Requer Edge Function ou servidor |

**Recomendação:** `@react-pdf/renderer` para relatórios de texto/tabela. Para relatórios com gráficos, considerar Puppeteer via Edge Function.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/relatorios/ExtratoIndividualPDF.tsx` | Novo — componente @react-pdf |
| `src/components/relatorios/RateioMensalPDF.tsx` | Novo |
| `src/components/relatorios/InadimplenciaPDF.tsx` | Novo |
| `src/pages/Extrato.tsx` | Botão "Exportar PDF" além do Excel |
| `src/pages/Resumo.tsx` | Botão "Relatório PDF" |
| `src/lib/pdf.ts` | Utilitários: formatação de moeda, datas, cabeçalho padrão |

---

## Identidade Visual

O PDF deve usar:
- Nome da clínica no cabeçalho (configurável via variável de ambiente ou tabela de configurações)
- Paleta de cores do sistema (azul/cinza)
- Fonte: Helvetica (embutida no jsPDF/react-pdf)

---

## Critérios de Aceite

- [ ] PDF do extrato individual gerado corretamente com todos os lançamentos do período
- [ ] Valores formatados em R$ com vírgula decimal
- [ ] Data de geração e usuário logado no rodapé
- [ ] Download automático ao clicar no botão (sem abrir pop-up bloqueado)
- [ ] Funciona em Chrome, Edge e Firefox

---

## Dependências

```bash
npm install @react-pdf/renderer
```

---

## Status

- [ ] Documentação criada
- [ ] Instalar @react-pdf/renderer
- [ ] Componente ExtratoIndividualPDF
- [ ] Integrar na página Extrato
- [ ] Componentes RateioMensal e Inadimplência
- [ ] Testes e deploy
