# Estórias de Negócio — Parcerias Clínicas

Documento de requisitos funcionais no formato de estórias de usuário (User Stories),
cobrindo todas as funcionalidades do sistema — implementadas e planejadas.

---

## Contexto do Negócio

O sistema gerencia parcerias clínicas entre a **Camta** e profissionais de saúde (médico, psicólogo 1, psicólogo 2).
Cada atendimento realizado gera um lançamento financeiro que é rateado entre os envolvidos conforme percentuais
contratuais de cada parceria. O pagamento pode ser à vista ou parcelado, e o repasse ao profissional deve
ocorrer somente após a confirmação do recebimento (baixa da parcela).

**Personas:**
- **Admin** — acesso total, configura o sistema, gerencia usuários
- **Gestor** — opera o dia a dia: cadastra atendimentos, baixa parcelas, concilia repasses
- **Profissional** — visualiza apenas o próprio extrato de repasses

---

## Funcionalidades Implementadas

### US-01 — Cadastrar Lançamento de Atendimento
**Como** gestor,  
**quero** registrar um atendimento com os dados do paciente, data, parceria e forma de pagamento,  
**para que** o sistema calcule automaticamente o rateio entre os profissionais e gere as parcelas de cobrança.

**Critérios de aceitação:**
- Campos obrigatórios: data de atendimento, nome do paciente, parceria, forma de pagamento, valor total
- Campos opcionais: responsável financeiro, meio de pagamento, observações
- Ao selecionar a parceria, o sistema exibe o rateio calculado em tempo real (preview)
- Os percentuais de rateio são lidos do banco (tabela `parcerias`), não hardcoded
- Para pagamento parcelado, o sistema gera N parcelas com vencimentos mensais
- Para pagamento à vista, uma única parcela é gerada
- O lançamento inicia com status `pendente`

---

### US-02 — Editar Lançamento com Auditoria
**Como** gestor,  
**quero** corrigir dados de um lançamento existente e informar o motivo da alteração,  
**para que** haja rastreabilidade de todas as modificações financeiras.

**Critérios de aceitação:**
- Apenas lançamentos com status `pendente` podem ser editados
- Cada campo alterado gera um registro em `lancamentos_edicoes_log` com valor anterior, novo e motivo
- O histórico de edições é acessível via botão "Histórico" em cada linha da tela de Lançamentos
- Apenas admin e gestor visualizam o histórico

---

### US-03 — Cancelar Lançamento com Motivo
**Como** gestor,  
**quero** cancelar um lançamento informando o motivo,  
**para que** o sistema registre o cancelamento de forma rastreável sem apagar os dados.

**Critérios de aceitação:**
- O motivo é obrigatório para confirmar o cancelamento
- Lançamentos com status `pago` não podem ser cancelados
- O cancelamento é registrado em `lancamentos_edicoes_log`
- Lançamentos cancelados aparecem com opacidade reduzida na listagem

---

### US-04 — Excluir Lançamento (Admin)
**Como** admin,  
**quero** excluir definitivamente um lançamento e seus dados relacionados,  
**para que** erros graves possam ser corrigidos com controle total.

**Critérios de aceitação:**
- Apenas admin pode excluir
- Confirmação obrigatória com motivo
- A exclusão gera registro em `lancamentos_log` antes de remover
- Parcelas e repasses associados são removidos em cascata

---

### US-05 — Visualizar e Filtrar Lançamentos
**Como** gestor,  
**quero** filtrar lançamentos por período, parceria e status,  
**para que** eu encontre rapidamente atendimentos específicos.

**Critérios de aceitação:**
- Filtros disponíveis: período (data início/fim), parceria (A/B/C), status (pendente/pago/cancelado)
- A listagem exibe: data, paciente, parceria, forma de pagamento, valor total, rateio, status, ações
- Exportação em PDF e Excel disponível para os resultados filtrados

---

### US-06 — Controlar Parcelas de Pagamento
**Como** gestor,  
**quero** visualizar todas as parcelas pendentes e marcar as pagas individualmente ou em lote,  
**para que** o fluxo de caixa seja atualizado conforme os recebimentos.

**Critérios de aceitação:**
- Listagem mostra: paciente, parceria, número da parcela, vencimento, valor, rateio, status
- Filtros: status, paciente (busca textual), período de vencimento
- KPIs no topo: total pendente, total vencido, total pago
- Parcelas vencidas (data_vencimento < hoje e status pendente) destacadas em vermelho
- Baixa individual: botão por linha
- Baixa em lote: checkbox múltiplo + botão consolidado com seletor de data
- Histórico de alterações por parcela acessível via botão

---

### US-07 — Renegociar Parcela Vencida
**Como** admin,  
**quero** renegociar uma parcela vencida com nova data de vencimento e observações,  
**para que** acordos extrajudiciais com pacientes sejam registrados.

**Critérios de aceitação:**
- Disponível apenas para admin
- Parcelas elegíveis: status `pendente` vencida ou `renegociada`
- Campos: nova data de vencimento, observações (obrigatório)
- Status muda para `renegociada`

---

### US-08 — Controlar Inadimplência
**Como** gestor,  
**quero** visualizar todos os pacientes com parcelas vencidas, agrupados por paciente,  
**para que** eu priorize a cobrança pelos casos mais graves.

**Critérios de aceitação:**
- Página dedicada `/inadimplencia` no menu
- KPIs: total de pacientes inadimplentes, total de parcelas vencidas, total em aberto, média de atraso
- Agrupamento por paciente com expand/collapse das parcelas individuais
- Badge de gravidade: Baixo (≤15d), Médio (≤30d), Alto (≤60d), Crítico (>60d)
- Ordenação por dias de atraso ou valor em aberto
- Filtros: parceria, período de vencimento
- Exportação em PDF
- Alerta vermelho no topo quando há inadimplentes

---

### US-09 — Gerenciar Repasses aos Profissionais
**Como** gestor,  
**quero** visualizar, conciliar e editar repasses por tipo de profissional,  
**para que** eu controle quando e quanto cada profissional recebeu.

**Critérios de aceitação:**
- Repasses criados automaticamente quando uma parcela é marcada como paga (trigger no banco)
- O valor do repasse é proporcional ao percentual da parcela paga em relação ao valor total
- Listagem por tipo: Médico, Camta, Psi1, Psi2
- Status: Não Conciliado / Conciliado
- Conciliação individual (com data do repasse) e em lote
- Desconciliação com motivo obrigatório
- Edição de valor do repasse com motivo obrigatório e log
- Histórico de alterações por repasse
- Badge laranja no menu com contagem de repasses não conciliados
- Filtros: período de atendimento, período de repasse, paciente, status
- Exportação em PDF e Excel por tipo de profissional

---

### US-10 — Visualizar Extrato (Profissional)
**Como** profissional,  
**quero** visualizar meu histórico de repasses recebidos com filtro de período,  
**para que** eu acompanhe minha remuneração sem depender do gestor.

**Critérios de aceitação:**
- Visível apenas para o profissional logado (role `profissional`)
- Exibe apenas os repasses do tipo correspondente ao seu perfil
- Filtro por período (data início/fim)
- Totalizadores: valor conciliado, valor pendente, quantidade de repasses

---

### US-11 — Dashboard Gerencial
**Como** gestor,  
**quero** visualizar indicadores consolidados do desempenho financeiro das parcerias,  
**para que** eu tome decisões com base em dados atualizados.

**Critérios de aceitação:**
- KPIs globais: total de atendimentos, receita total, receita recebida, parcelas vencidas
- KPIs comparativos: receita do mês vs mês anterior, ticket médio, atendimentos do mês, valor em aberto
- Gráfico de receita mensal (12 meses, empilhado por parceria)
- Gráfico de inadimplência mensal (vencidas, pagas, taxa percentual)
- Ranking de profissionais por mês (seletor de mês)

---

### US-12 — Resumo por Parceria
**Como** gestor,  
**quero** ver o consolidado financeiro por parceria com rateio detalhado,  
**para que** eu acompanhe a performance de cada contrato.

**Critérios de aceitação:**
- Filtros: período e parceria específica
- Tabela com: parceria, total de atendimentos, receita total, rateio por tipo (camta/medico/psi1/psi2)
- Gráfico de barras por profissional
- Exportação em PDF

---

### US-13 — Gerar Relatórios
**Como** gestor,  
**quero** gerar relatórios em PDF e Excel para os diferentes aspectos do sistema,  
**para que** eu compartilhe informações com a diretoria ou arquive para auditoria.

**Critérios de aceitação:**
- Relatório de Lançamentos: filtros por período e parceria, detalhamento completo com rateio
- Relatório de Inadimplência: parcelas vencidas com dias de atraso
- Relatório de Rateio Mensal: consolidado por parceria + detalhamento de atendimentos do mês
- Relatório Mensal de Repasses: resumo e detalhe por profissional, PDF + Excel com abas separadas
- Todos os PDFs incluem: logo da clínica, cabeçalho colorido, rodapé com nome do usuário, data e número de página

---

### US-14 — Configurar Parcerias e Percentuais
**Como** admin,  
**quero** ajustar os percentuais de rateio de cada parceria,  
**para que** o sistema reflita os contratos vigentes sem precisar de código.

**Critérios de aceitação:**
- Tela de Configurações com listagem das parcerias ativas
- Campos editáveis: descrição, camta_pct, medico_pct, psi1_pct, psi2_pct
- Os novos percentuais afetam apenas lançamentos futuros

---

### US-15 — Gerenciar Usuários
**Como** admin,  
**quero** criar, editar e desativar usuários com roles específicos,  
**para que** cada pessoa acesse apenas o que lhe compete.

**Critérios de aceitação:**
- Roles disponíveis: admin, gestor, profissional
- Admin gerencia todos os usuários
- Profissional associado a um tipo (camta/medico/psi1/psi2) para exibir o extrato correto
- Usuário inativo não acessa o sistema

---

## Funcionalidades Planejadas — Bloco 4 (Comunicação)

### US-16 — Receber Notificação de Repasse Conciliado
**Como** profissional,  
**quero** receber um e-mail quando meu repasse for conciliado pelo gestor,  
**para que** eu saiba que o pagamento foi efetuado sem precisar acessar o sistema.

**Critérios de aceitação:**
- E-mail disparado automaticamente no momento da conciliação
- Conteúdo: nome do paciente, data do atendimento, valor do repasse, data da conciliação
- E-mail destinado ao endereço cadastrado no perfil do profissional
- Apenas repasses conciliados (não desconciliações) geram notificação

---

### US-17 — Receber Alerta de Parcelas Vencidas
**Como** gestor,  
**quero** receber um e-mail diário quando houver parcelas vencidas sem baixa,  
**para que** eu não precise monitorar o sistema continuamente.

**Critérios de aceitação:**
- Cron diário às 8h (cron já existe na migration 002, Edge Function pendente)
- E-mail enviado apenas quando houver parcelas vencidas (sem spam em dias limpos)
- Lista com: paciente, parceria, vencimento, valor, dias de atraso
- Link direto para a tela de Parcelas no sistema

---

### US-18 — Receber Resumo Mensal
**Como** admin,  
**quero** receber um e-mail resumido no primeiro dia de cada mês,  
**para que** eu tenha visão do desempenho do mês anterior sem abrir o sistema.

**Critérios de aceitação:**
- Enviado no dia 1 de cada mês às 7h
- Conteúdo: total de atendimentos, receita total, receita recebida, repasses pendentes, inadimplência
- Destinatários: todos os usuários com role admin ou gestor

---

## Funcionalidades Implementadas — Bloco 5 (Qualidade de Dados)

### US-19 — Detectar Lançamento Duplicado
**Status:** ✅ Implementado (2026-09-08)
**Como** gestor,  
**quero** ser alertado quando estou cadastrando um atendimento possivelmente duplicado,  
**para que** eu não lance duas vezes o mesmo atendimento por erro.

**Critérios de aceitação:**
- O alerta é exibido ao preencher paciente + data + parceria, antes de salvar
- Critério de similaridade: mesmo paciente (nome exato), data ±1 dia, mesma parceria
- O alerta é informativo (amarelo), não bloqueia o cadastro
- O alerta exibe link para o lançamento existente
- Não é aplicado em edições, apenas em novos cadastros

---

### US-20 — Validar Integridade do Rateio
**Status:** ✅ Implementado (2026-09-08)

**Como** gestor,  
**quero** ser avisado quando o rateio calculado não fecha com o valor total do atendimento,  
**para que** eu corrija o percentual antes que o erro entre no banco.

**Critérios de aceitação:**
- Verificação em tempo real no formulário de lançamento
- Tolerância de R$ 0,02 (arredondamentos aceitáveis)
- Badge vermelho "Rateio inconsistente" com a diferença calculada
- Em Configurações, aviso quando percentuais de uma parceria não somam 100%
- Não bloqueia o salvamento — apenas alerta (admin pode ter motivo)

---

### US-21 — Importar Lançamentos via Excel
**Como** gestor,  
**quero** fazer upload de uma planilha Excel com múltiplos atendimentos,  
**para que** eu cadastre em lote sem digitar linha a linha.

**Critérios de aceitação:**
- Template Excel disponível para download com colunas padronizadas
- Validação linha a linha antes de importar: erros marcados em vermelho, válidas em verde
- Preview mostra quantas linhas serão importadas e quais têm erro
- Erros não bloqueiam importação das linhas válidas (import parcial permitido)
- Rateio calculado automaticamente para cada linha válida

---

## Funcionalidades Planejadas — Bloco 6 (Experiência do Profissional)

### US-22 — Visualizar Evolução dos Repasses (Gráfico)
**Como** profissional,  
**quero** ver um gráfico com a evolução mensal dos meus repasses,  
**para que** eu acompanhe minha tendência de remuneração ao longo do tempo.

**Critérios de aceitação:**
- Gráfico de linha com os últimos 12 meses no topo da tela de Extrato
- KPIs: total recebido no mês atual, média mensal dos últimos 12 meses, melhor mês
- Visível apenas para o profissional logado (não para gestor/admin no Extrato)

---

### US-23 — Gerar Comprovante de Repasse
**Como** profissional,  
**quero** gerar um comprovante PDF de um repasse conciliado,  
**para que** eu tenha documentação do recebimento para fins pessoais ou contábeis.

**Critérios de aceitação:**
- Botão "Gerar comprovante" em cada linha do Extrato para repasses conciliados
- PDF individual com: logo da clínica, dados do atendimento, valor do repasse, data de conciliação
- Mesmo padrão visual dos outros relatórios (cabeçalho, rodapé, acesso restrito)

---

### US-24 — Visualizar Painel de Renegociações
**Como** gestor,  
**quero** ver um painel centralizado com todas as parcelas renegociadas,  
**para que** eu acompanhe acordos em vigor sem precisar filtrar manualmente.

**Critérios de aceitação:**
- Aba ou filtro dedicado "Renegociadas" na tela de Parcelas
- Exibe: paciente, parceria, vencimento original, novo vencimento, observações, data da renegociação
- Exportação em PDF

---

## Regras de Negócio Transversais

| Regra | Descrição |
|-------|-----------|
| RN-01 | Percentuais de rateio são lidos do banco (`parcerias`), nunca hardcoded |
| RN-02 | Repasse criado proporcionalmente à parcela paga, não ao valor total do lançamento |
| RN-03 | Repasse conciliado não pode ser alterado sem motivo registrado em log |
| RN-04 | Lançamento cancelado não gera nem atualiza repasses |
| RN-05 | Toda ação de edição, cancelamento ou exclusão exige motivo e gera log com usuário e timestamp |
| RN-06 | Profissional vê apenas seus próprios repasses (filtrado por tipo no extrato) |
| RN-07 | Admin é o único que pode excluir lançamentos e renegociar parcelas |
| RN-08 | PDFs incluem sempre: logo, cabeçalho institucional, rodapé com nome do gerador e "acesso restrito" |
| RN-09 | Filtros em colunas de tabelas relacionadas são feitos no cliente (limitação do Supabase PostgREST) |
| RN-10 | Parcelas com status `pago` não podem ser revertidas via interface (apenas via admin no banco) |
