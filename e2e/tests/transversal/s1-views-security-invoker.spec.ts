import { test, expect } from '../../fixtures'
import { descrever } from '../../helpers/api'
import { VIEWS_FINANCEIRAS } from '../../helpers/funcoes'

// Onda 0 / S1 (migration 043): as 3 views financeiras passam a respeitar a RLS de quem consulta.
// Telas que as usam (grep em App/src/services): /resumo -> resumo_por_parceria e resumo_profissional; /conta-corrente -> vw_saldo_parceria.
// Ambas sao telas so de admin/financeiro (RoleGuard): profissional e recepcionista caem em redirect, sem chamar as views.
//   admin e financeiro: 200 com dados (> 0 linhas); sem erro de API nas telas
//   profissional e recepcionista: 200 e vazio ou so zeros (nunca 4xx/5xx)

const numeros = (linha: Record<string, unknown>) => Object.values(linha).filter(v => typeof v === 'number') as number[]
const todosZeros = (linhas: Record<string, unknown>[]) => linhas.every(l => numeros(l).every(n => n === 0))

for (const v of VIEWS_FINANCEIRAS) {
  test(`view ${v}: comportamento por perfil na API`, async ({ api, perfil }) => {
    const r = await api.get(`${v}?select=*&limit=1000`)
    expect(r.status, descrever(r)).toBe(200)
    expect(Array.isArray(r.body)).toBe(true)
    test.info().annotations.push({ type: 'linhas', description: `${perfil.id}/${v}: ${r.body.length} linha(s)` })
    // Débito conhecido S5 (Onda 1): movimentacoes_parceria tem RLS só por PAPEL (admin/gestor), então vw_saldo_parceria ainda
    // mostra a conta corrente à recepcionista (role gestor). Quando a S5 for corrigida este teste PASSA e o Playwright acusa
    // "esperava falhar": remova este test.fail().
    test.fail(v === 'vw_saldo_parceria' && perfil.id === 'recepcionista', 'S5: RLS de movimentacoes_parceria por papel, não por acl_ver(conta_corrente)')
    if (perfil.id === 'admin' || perfil.id === 'financeiro') {
      expect(r.body.length, `${perfil.id} deve ver dados em ${v}`).toBeGreaterThan(0)
    } else {
      expect(todosZeros(r.body), `${perfil.id} so pode ver vazio/zeros em ${v}: ${r.body.length} linha(s)`).toBe(true)
    }
  })
}

test('admin e financeiro: Resumo e Conta Corrente abrem com dados e sem erro de API/console', async ({ page, coletor, perfil }) => {
  test.skip(!['admin', 'financeiro'].includes(perfil.id), 'so admin/financeiro')
  const vistas: string[] = []
  page.on('response', r => {
    const m = r.url().match(/rest\/v1\/(vw_saldo_parceria|resumo_por_parceria|resumo_profissional)/)
    if (m) vistas.push(`${r.status()} ${m[1]}`)
  })
  for (const rota of ['/resumo', '/conta-corrente']) {
    await page.goto(rota)
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 })
    await page.waitForLoadState('networkidle')
  }
  test.info().annotations.push({ type: 'chamadas-views', description: vistas.join(' | ') })
  expect(vistas.length, 'as telas chamaram as views').toBeGreaterThan(0)
  expect(vistas.filter(v => !v.startsWith('200'))).toEqual([])
  expect(coletor.resumoApi(), 'respostas >= 400').toEqual([])
  expect(coletor.consoleErros, 'erros de console').toEqual([])
})

test('profissional e recepcionista: /resumo e /conta-corrente redirecionam sem erro de API', async ({ page, coletor, perfil }) => {
  test.skip(!['profissional', 'recepcionista'].includes(perfil.id), 'so profissional/recepcionista')
  await page.goto('/')
  for (const rota of ['/resumo', '/conta-corrente']) {
    await page.goto(rota)
    await page.waitForLoadState('networkidle')
    expect(new URL(page.url()).pathname, `${rota} nao pode abrir para ${perfil.id}`).not.toBe(rota)
  }
  expect(coletor.resumoApi(), 'respostas >= 400').toEqual([])
})
