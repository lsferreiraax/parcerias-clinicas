/**
 * Matriz perfil x rota ESPERADA (fonte única de verdade dos testes de permissão).
 * Reflete main.tsx (RoleGuard: role + módulo do perfil de acesso) e o menu do Layout.tsx.
 * Se um perfil de acesso de teste mudar no staging, ajuste AQUI e em docs/qa-processo-de-teste.md.
 */
import type { PerfilId } from '../config'

export const MENU_LABEL: Record<string, string> = {
  '/': 'Dashboard',
  '/lancamentos': 'Lançamentos',
  '/parcelas': 'Parcelas',
  '/inadimplencia': 'Inadimplência',
  '/resumo': 'Resumo',
  '/extrato': 'Extrato',
  '/repasses': 'Repasses',
  '/conta-corrente': 'Conta Corrente',
  '/pacientes': 'Pacientes',
  '/agenda': 'Agenda',
  '/dashboard-psicologia': 'Psicologia',
  '/prontuario': 'Prontuário',
  '/titular-dados': 'Titular de Dados',
  '/salas': 'Salas',
  '/grade-salas': 'Grade de Salas',
  '/condominio': 'Condomínio',
  '/relatorios': 'Relatórios',
  '/usuarios': 'Usuários',
  '/perfis': 'Perfis de Acesso',
  '/configuracoes': 'Configurações',
}

export const TODAS_AS_ROTAS = Object.keys(MENU_LABEL)

export interface Bloqueio {
  rota: string
  /** Caminhos finais aceitos (a rota não pode permanecer aberta). */
  destinos: string[]
}

export interface PerfilE2E {
  id: PerfilId
  /** Rotas que DEVEM abrir (e compor o menu). */
  permitidas: string[]
  /** Rotas que NÃO devem abrir, com o destino aceito. */
  bloqueadas: Bloqueio[]
}

const FINANCEIRAS = ['/', '/lancamentos', '/parcelas', '/inadimplencia', '/resumo', '/extrato', '/repasses', '/conta-corrente', '/relatorios']
const PSICOLOGIA_OPERACIONAL = ['/pacientes', '/agenda', '/dashboard-psicologia']
const SO_ADMIN = ['/titular-dados', '/salas', '/condominio', '/usuarios', '/perfis', '/configuracoes']

const bloquear = (rotas: string[], destinos: string[]): Bloqueio[] => rotas.map(rota => ({ rota, destinos }))

export const PERFIS: Record<PerfilId, PerfilE2E> = {
  // Admin: 19 rotas abrem; /prontuario é exclusiva do role profissional e redireciona para "/".
  admin: {
    id: 'admin',
    permitidas: TODAS_AS_ROTAS.filter(r => r !== '/prontuario'),
    bloqueadas: bloquear(['/prontuario'], ['/']),
  },
  // Financeiro (role gestor): 9 telas financeiras; psicologia/salas -> /sem-acesso (módulo); rotas só-admin -> "/".
  financeiro: {
    id: 'financeiro',
    permitidas: FINANCEIRAS,
    bloqueadas: [
      ...bloquear([...PSICOLOGIA_OPERACIONAL, '/grade-salas'], ['/sem-acesso']),
      ...bloquear(['/prontuario', ...SO_ADMIN], ['/']),
    ],
  },
  // Profissional (role profissional, vinculado à Dra. Ana Lima): menu de 4 itens.
  // Rotas de gestão caem no redirect da role ("/extrato"); o fato de /extrato abrir é o débito DT4.
  profissional: {
    id: 'profissional',
    permitidas: [...PSICOLOGIA_OPERACIONAL, '/prontuario'],
    bloqueadas: bloquear(
      [...FINANCEIRAS.filter(r => r !== '/extrato'), '/grade-salas', ...SO_ADMIN],
      ['/extrato', '/sem-acesso'],
    ),
  },
  // Recepcionista (role gestor, perfil "Agenda e pacientes"): 4 itens; financeiro e prontuário bloqueados.
  // /extrato hoje abre (DT4): tratado em teste test.fail separado, por isso fica fora de `bloqueadas`.
  recepcionista: {
    id: 'recepcionista',
    permitidas: [...PSICOLOGIA_OPERACIONAL, '/grade-salas'],
    bloqueadas: bloquear(
      [...FINANCEIRAS.filter(r => r !== '/extrato'), '/prontuario', ...SO_ADMIN],
      ['/sem-acesso'],
    ),
  },
}

/** Telas principais para o smoke de rolagem horizontal em 375px. */
export const PRINCIPAIS_MOBILE = ['/', '/lancamentos', '/parcelas', '/repasses', '/extrato', '/pacientes', '/agenda', '/dashboard-psicologia', '/relatorios']
