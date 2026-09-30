import { test, expect } from '../../fixtures'
import { psicologiaExposta } from '../../config'
import { ApiLeitura, clienteAnonimo, descrever, semDados } from '../../helpers/api'

// Sem login: chamadas GET/RPC com a chave anon pública. Esperado: nenhuma linha, nunca dado real.
// Mensagens só com status, contagem de linhas e código de erro (ver descrever()).

let anon: ApiLeitura
test.beforeAll(async () => { anon = await clienteAnonimo() })

const SALA_QUALQUER = '00000000-0000-4000-8000-000000000000'
const TABELAS_PSICOLOGIA = ['sessoes', 'salas', 'bloqueios_sala', 'prontuarios', 'prontuario_acessos', 'contratos_sala', 'despesas_condominio', 'demonstrativos_condominio']
const TABELAS_PUBLIC = ['lancamentos', 'parcelas', 'repasses', 'pacientes', 'user_profiles', 'profissionais']

test.describe('API anônima em produção: nenhuma linha', () => {
  test('tabelas sensíveis de public não devolvem dado ao anônimo', async () => {
    for (const t of TABELAS_PUBLIC) {
      const r = await anon.get(`${t}?select=*&limit=1`)
      expect.soft(semDados(r), `public.${t}: ${descrever(r)}`).toBe(true)
    }
  })

  test('tabelas de psicologia não devolvem dado ao anônimo', async () => {
    // Hoje o schema não está exposto em produção (406 é aceito); com PROD_PSICOLOGIA_EXPOSTA=sim, 406 passa a ser falha.
    const exposta = psicologiaExposta()
    for (const t of TABELAS_PSICOLOGIA) {
      const r = await anon.get(`${t}?select=*&limit=1`, 'psicologia')
      expect.soft(semDados(r, !exposta), `psicologia.${t}: ${descrever(r)}`).toBe(true)
    }
  })

  test('funções SECURITY DEFINER negam o anônimo (401)', async () => {
    const casos: Array<[string, Promise<{ status: number; body: any }>]> = [
      ['listar_perfis_com_email', anon.rpc('listar_perfis_com_email', {})],
      ['acl_ver', anon.rpc('acl_ver', { p_modulo: 'psicologia' })],
      ['acl_editar', anon.rpc('acl_editar', { p_modulo: 'psicologia' })],
      ['meu_profissional_id', anon.rpc('meu_profissional_id', {})],
      ['psicologia.sala_disponivel', anon.rpc('sala_disponivel', {
        p_sala_id: SALA_QUALQUER, p_data: '2030-01-01', p_hora_inicio: '08:00', p_hora_fim: '09:00', p_sessao_id_excluir: null,
      }, 'psicologia')],
    ]
    for (const [nome, p] of casos) {
      const r = await p
      // Negado = 401/403. Função inexistente (404 PGRST202) também não expõe nada ao anônimo, mas é avisada:
      // indica migração ainda não promovida. No schema psicologia não exposto, 406 é aceito (mesmo motivo do teste anterior).
      const inexistente = r.status === 404 && r.body?.code === 'PGRST202'
      const naoExposto = nome.startsWith('psicologia.') && !psicologiaExposta() && r.status === 406
      const ok = r.status === 401 || r.status === 403 || inexistente || naoExposto
      if (inexistente) console.log(`[aviso] ${nome}: função inexistente em produção (PGRST202); anônimo não tem acesso de qualquer forma`)
      expect.soft(ok, `${nome}: ${descrever(r)} (esperado 401)`).toBe(true)
    }
  })
})
