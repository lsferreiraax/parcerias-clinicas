import { test, expect } from '../../fixtures'
import { SUPABASE_URL } from '../../config'
import { ApiLeitura } from '../../helpers/api'
import { escritaPermitida } from '../../helpers/somente-leitura'

// Meta-testes do guarda de SOMENTE LEITURA. As escritas provocadas aqui são ABORTADAS no navegador
// (route.abort): nenhuma requisição chega ao servidor.

test.describe('Guarda de somente leitura', () => {
  test('allowlist: só login/logout e RPCs de leitura escapam do bloqueio', async () => {
    const p = (m: string, path: string) => escritaPermitida(m, `${SUPABASE_URL}${path}`)
    expect(p('POST', '/auth/v1/token?grant_type=password')).toBe(true)
    expect(p('POST', '/auth/v1/logout')).toBe(true)
    for (const f of ['listar_perfis_com_email', 'acl_ver', 'acl_editar', 'meu_profissional_id', 'sala_disponivel']) {
      expect(p('POST', `/rest/v1/rpc/${f}`), `rpc ${f}`).toBe(true)
    }
    expect(p('GET', '/rest/v1/lancamentos')).toBe(true)
    // escritas e RPCs fora da allowlist
    expect(p('POST', '/rest/v1/lancamentos')).toBe(false)
    expect(p('PATCH', '/rest/v1/parcelas?id=eq.1')).toBe(false)
    expect(p('DELETE', '/rest/v1/pacientes')).toBe(false)
    expect(p('PUT', '/auth/v1/user')).toBe(false)
    expect(p('POST', '/rest/v1/rpc/baixar_parcela')).toBe(false)
    expect(p('PATCH', '/auth/v1/token')).toBe(false)
    expect(escritaPermitida('POST', 'https://example.com/auth/v1/token')).toBe(false)
  })

  test('no navegador: POST/PATCH/PUT/DELETE fora da allowlist são abortados e registrados', async ({ page, guarda }) => {
    await page.goto('/login')
    const tentativas = [
      ['POST', `${SUPABASE_URL}/rest/v1/lancamentos`],
      ['PATCH', `${SUPABASE_URL}/rest/v1/parcelas?id=eq.x`],
      ['DELETE', `${SUPABASE_URL}/rest/v1/pacientes?id=eq.x`],
      ['PUT', `${SUPABASE_URL}/auth/v1/user`],
      ['POST', `${SUPABASE_URL}/rest/v1/rpc/funcao_que_escreve`],
      ['POST', 'https://example.com/qualquer'],
    ] as const
    for (const [metodo, url] of tentativas) {
      const resultado = await page.evaluate(async ([m, u]) => {
        try { await fetch(u, { method: m, body: '{}', headers: { 'Content-Type': 'application/json' } }); return 'enviada' } catch { return 'abortada' }
      }, [metodo, url] as const)
      expect(resultado, `${metodo} ${new URL(url).pathname} deve ser abortada`).toBe('abortada')
    }
    const v = guarda.consumir() // consumimos: a violação era o objetivo do teste
    expect(v.length, 'violações registradas').toBe(tentativas.length)
    expect(v.every(x => !x.includes('?')), 'mensagens sem query string').toBe(true)
  })

  test('no navegador: RPC de leitura da allowlist NÃO é abortada (chega ao servidor, sem apikey => 401)', async ({ page, guarda }) => {
    await page.goto('/login')
    const status = await page.evaluate(async u => {
      try { return (await fetch(u, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })).status } catch { return -1 }
    }, `${SUPABASE_URL}/rest/v1/rpc/acl_ver`)
    expect(status, 'status da RPC de leitura (não abortada)').toBeGreaterThanOrEqual(400)
    expect(status).not.toBe(-1)
    expect(guarda.violacoes, guarda.mensagem()).toEqual([])
    expect(guarda.permitidas, 'POSTs da allowlist que passaram').toBe(1)
  })

  test('cliente de API direta não tem escrita e recusa RPC fora da allowlist', async () => {
    const api = new ApiLeitura('chave-inexistente') as unknown as Record<string, unknown>
    for (const m of ['post', 'patch', 'put', 'delete']) expect(typeof api[m], `método ${m}`).toBe('undefined')
    expect(() => (api as unknown as ApiLeitura).rpc('baixar_parcela', {})).toThrow(/RECUSADO/)
  })
})
