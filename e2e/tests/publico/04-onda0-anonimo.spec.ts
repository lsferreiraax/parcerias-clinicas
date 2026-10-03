import { test, expect } from '@playwright/test'
import { ApiRest, clienteAnonimo, descrever, semDados } from '../../helpers/api'
import { VIEWS_FINANCEIRAS, chamarEdge, descreverFn } from '../../helpers/funcoes'

// Onda 0 de segurança (auditoria 2026-10-02), SEM login, só no STAGING.
//  S1: o anônimo não lê as 3 views financeiras (migration 043).
//  S2/S3: a chave anon pública (ou nenhum token) recebe 401 em psicologia-eventos e backup-banco.
// ATENÇÃO: se a Onda 0 AINDA NÃO foi aplicada no staging, estes testes falham de propósito (é o "antes");
// as chamadas das funções usam um UUID inexistente e nada de real é enviado, mas backup-banco antigo (sem S3) rodaria um backup.

let anon: ApiRest
test.beforeAll(async () => { anon = await clienteAnonimo() })

const SESSAO_INEXISTENTE = '00000000-0000-4000-8000-000000000000'

test.describe('S1: views financeiras negam o anônimo', () => {
  for (const v of VIEWS_FINANCEIRAS) {
    test(`public.${v} não devolve dado ao anônimo`, async () => {
      const r = await anon.get(`${v}?select=*&limit=5`)
      expect(r.status, descrever(r)).not.toBe(406)
      expect(semDados(r), `${descrever(r)} (esperado 401/403 ou lista vazia)`).toBe(true)
      // com a 043 aplicada o esperado exato é negado por permissão (REVOKE); lista vazia só seria aceitável por RLS
      expect([401, 403, 200], descrever(r)).toContain(r.status)
    })
  }
})

test.describe('S2: psicologia-eventos exige usuário autenticado', () => {
  const casos: Array<[string, unknown]> = [['POST {}', {}], ['POST com sessao_id', { sessao_id: SESSAO_INEXISTENTE }]]
  for (const [rotulo, corpo] of casos) {
    test(`chave anon, ${rotulo} -> 401`, async () => {
      const r = await chamarEdge('psicologia-eventos', corpo, 'anon')
      expect(r.status, descreverFn(r)).toBe(401)
    })
    test(`sem Authorization, ${rotulo} -> 401`, async () => {
      const r = await chamarEdge('psicologia-eventos', corpo, 'nenhum')
      expect(r.status, descreverFn(r)).toBe(401)
    })
  }
})

test.describe('S2: token vazio', () => {
  test('Authorization com token vazio -> 401', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: SESSAO_INEXISTENTE }, '')
    expect(r.status, descreverFn(r)).toBe(401)
  })
})

test.describe('S3: backup-banco só aceita a service role', () => {
  const casos: Array<[string, unknown]> = [['POST {}', {}], ['POST com sessao_id', { sessao_id: SESSAO_INEXISTENTE }]]
  for (const [rotulo, corpo] of casos) {
    test(`chave anon, ${rotulo} -> 401`, async () => {
      const r = await chamarEdge('backup-banco', corpo, 'anon')
      expect(r.status, descreverFn(r)).toBe(401)
    })
    test(`sem Authorization, ${rotulo} -> 401`, async () => {
      const r = await chamarEdge('backup-banco', corpo, 'nenhum')
      expect(r.status, descreverFn(r)).toBe(401)
    })
  }
})
