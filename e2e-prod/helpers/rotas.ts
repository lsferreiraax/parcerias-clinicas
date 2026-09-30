/** Rotas do app por grupo (espelha App/e2e/helpers/rotas.ts; ajuste aqui se o menu mudar). */
export const FINANCEIRAS = ['/', '/lancamentos', '/parcelas', '/inadimplencia', '/resumo', '/extrato', '/repasses', '/conta-corrente', '/relatorios']
export const ADMINISTRACAO = ['/usuarios', '/perfis', '/configuracoes']
/** Telas de Psicologia/Salas (só testadas com PROD_PSICOLOGIA_EXPOSTA=sim). */
export const PSICOLOGIA = ['/agenda', '/pacientes', '/grade-salas', '/salas', '/condominio', '/dashboard-psicologia']
/** Itens do menu do admin (19; /prontuario é exclusivo do role profissional; /titular-dados só compõe o menu). */
export const MENU_ADMIN = [
  '/', '/lancamentos', '/parcelas', '/inadimplencia', '/resumo', '/extrato', '/repasses', '/conta-corrente',
  '/pacientes', '/agenda', '/dashboard-psicologia', '/titular-dados', '/salas', '/grade-salas', '/condominio',
  '/relatorios', '/usuarios', '/perfis', '/configuracoes',
]
/** Telas principais para o teste de rolagem horizontal em 375px. */
export const PRINCIPAIS_MOBILE = ['/', '/lancamentos', '/parcelas', '/repasses', '/extrato', '/relatorios', '/usuarios']
