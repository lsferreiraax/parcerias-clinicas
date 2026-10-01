import { test, expect } from '../../fixtures'
import { PROFISSIONAL_ANA_ID } from '../../config'
import { descrever, semDados } from '../../helpers/api'
import { criarPacienteQA, nomeQA } from '../../helpers/dados'
import { dataLocal } from '../../helpers/ui'

// Provas de RLS pela API com o token do financeiro (role gestor, perfil sem psicologia/salas).

test.describe('Financeiro: RLS pela API', () => {
  for (const tabela of ['sessoes', 'salas', 'bloqueios_sala', 'prontuarios', 'contratos_sala', 'despesas_condominio', 'demonstrativos_condominio']) {
    test(`psicologia.${tabela}: 0 linhas`, async ({ api }) => {
      const r = await api.get(`${tabela}?select=*&limit=5`, 'psicologia')
      expect(r.status, descrever(r)).not.toBe(406)
      expect(semDados(r), descrever(r)).toBe(true)
    })
  }

  test('public.pacientes: 0 linhas', async ({ api }) => {
    const r = await api.get('pacientes?select=*&limit=5')
    expect(semDados(r), descrever(r)).toBe(true)
  })

  test('POST em psicologia.sessoes é negado (403)', async ({ api, apiAdmin }) => {
    const pac = await criarPacienteQA(apiAdmin, 'Paciente-RLS-financeiro')
    const r = await api.post('sessoes', {
      paciente_id: pac.id, profissional_id: PROFISSIONAL_ANA_ID, data_sessao: dataLocal(30), hora_inicio: '08:00',
      observacoes: nomeQA('Sessao-indevida-financeiro'),
    }, 'psicologia')
    expect(r.status, descrever(r)).toBe(403)
  })

  test('POST em public.pacientes é negado (403)', async ({ api }) => {
    const r = await api.post('pacientes', { nome: nomeQA('Paciente-indevido-financeiro') })
    expect(r.status, descrever(r)).toBe(403)
  })

  test('as funções de ACL respondem ao financeiro logado (acl_ver psicologia = false)', async ({ api }) => {
    const r = await api.rpc('acl_ver', { p_modulo: 'psicologia' })
    expect(r.status, descrever(r)).toBe(200)
    expect(r.body).toBe(false)
  })
})
