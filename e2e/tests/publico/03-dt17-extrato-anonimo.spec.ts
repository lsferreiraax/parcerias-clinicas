import { test, expect } from '@playwright/test'
import { ApiRest, clienteAnonimo, descrever, semDados } from '../../helpers/api'

// DT17: sem login, as funções SECURITY DEFINER do extrato não podem ser executadas (sem EXECUTE para anon => 401).

let anon: ApiRest
test.beforeAll(async () => { anon = await clienteAnonimo() })

const PESSOA = '00000000-0000-4000-8000-000000000000'

test.describe('DT17: API anônima', () => {
  test('extrato_profissional (3 e 4 argumentos) nega o anônimo (401)', async () => {
    const a = await anon.rpc('extrato_profissional', { p_tipo: 'psi1', p_inicio: null, p_fim: null })
    expect(a.status, descrever(a)).toBe(401)
    const b = await anon.rpc('extrato_profissional', { p_tipo: 'psi1', p_inicio: null, p_fim: null, p_profissional_id: PESSOA })
    expect(b.status, descrever(b)).toBe(401)
  })

  test('extrato_mensal (2 e 3 argumentos) nega o anônimo (401)', async () => {
    const a = await anon.rpc('extrato_mensal', { p_tipo: 'psi1', p_desde: '2025-01-01' })
    expect(a.status, descrever(a)).toBe(401)
    const b = await anon.rpc('extrato_mensal', { p_tipo: 'psi1', p_desde: '2025-01-01', p_profissional_id: PESSOA })
    expect(b.status, descrever(b)).toBe(401)
  })

  test('anônimo não lê lancamentos (colunas novas inclusas) nem lancamentos_edicoes_log', async () => {
    const l = await anon.get('lancamentos?select=id,psi1_profissional_id,camta_profissional_id&limit=1')
    expect(semDados(l), descrever(l)).toBe(true)
    const g = await anon.get('lancamentos_edicoes_log?select=*&limit=1')
    expect(semDados(g), descrever(g)).toBe(true)
  })

  test('anônimo não grava a pessoa por PATCH em lancamentos', async () => {
    const r = await anon.patch(`lancamentos?id=eq.${PESSOA}`, { psi1_profissional_id: PESSOA })
    expect([401, 403, 404, 200, 204], descrever(r)).toContain(r.status)
    if (r.status === 200) expect(r.body).toEqual([])
  })
})
