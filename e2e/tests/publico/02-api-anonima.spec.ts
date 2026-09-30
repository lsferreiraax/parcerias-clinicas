import { test, expect } from '@playwright/test'
import { ApiRest, clienteAnonimo, descrever, semDados } from '../../helpers/api'

// Sem login: chamadas com a chave anon pública. Esperado: nada de dado, nunca 406 (schema não exposto) nem linhas.

let anon: ApiRest
test.beforeAll(async () => { anon = await clienteAnonimo() })

const SALA_QUALQUER = '00000000-0000-4000-8000-000000000000'

test.describe('API anônima: tabelas sem dado', () => {
  for (const tabela of ['sessoes', 'salas', 'bloqueios_sala', 'prontuarios', 'prontuario_acessos', 'contratos_sala', 'despesas_condominio', 'demonstrativos_condominio']) {
    test(`psicologia.${tabela} não devolve dado ao anônimo`, async () => {
      const r = await anon.get(`${tabela}?select=*&limit=1`, 'psicologia')
      expect(r.status, descrever(r)).not.toBe(406)
      expect(semDados(r), descrever(r)).toBe(true)
    })
  }

  test('public.pacientes não devolve dado ao anônimo', async () => {
    const r = await anon.get('pacientes?select=*&limit=1')
    expect(r.status, descrever(r)).not.toBe(406)
    expect(semDados(r), descrever(r)).toBe(true)
  })

  for (const tabela of ['lancamentos', 'parcelas', 'repasses', 'user_profiles', 'profissionais']) {
    test(`public.${tabela} não devolve dado ao anônimo`, async () => {
      const r = await anon.get(`${tabela}?select=*&limit=1`)
      expect(r.status, descrever(r)).not.toBe(406)
      expect(semDados(r), descrever(r)).toBe(true)
    })
  }
})

test.describe('API anônima: funções SECURITY DEFINER negam anônimo', () => {
  test('listar_perfis_com_email()', async () => {
    const r = await anon.rpc('listar_perfis_com_email', {})
    expect(r.status, descrever(r)).toBe(401)
  })
  test('acl_ver(p_modulo)', async () => {
    const r = await anon.rpc('acl_ver', { p_modulo: 'psicologia' })
    expect(r.status, descrever(r)).toBe(401)
  })
  test('acl_editar(p_modulo)', async () => {
    const r = await anon.rpc('acl_editar', { p_modulo: 'psicologia' })
    expect(r.status, descrever(r)).toBe(401)
  })
  test('meu_profissional_id()', async () => {
    const r = await anon.rpc('meu_profissional_id', {})
    expect(r.status, descrever(r)).toBe(401)
  })
  test('psicologia.sala_disponivel(...) (DT6)', async () => {
    const r = await anon.rpc('sala_disponivel', {
      p_sala_id: SALA_QUALQUER, p_data: '2030-01-01', p_hora_inicio: '08:00', p_hora_fim: '09:00', p_sessao_id_excluir: null,
    }, 'psicologia')
    expect(r.status, descrever(r)).toBe(401)
  })
})
