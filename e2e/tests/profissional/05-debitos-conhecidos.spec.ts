import { test, expect } from '../../fixtures'
import { descrever, semDados } from '../../helpers/api'
import { abrirRota } from '../../helpers/ui'

// Débitos conhecidos: cada teste descreve o comportamento CORRETO e hoje falha (test.fail).
// Quando o débito for corrigido o teste passa e o Playwright acusa "Expected to fail, but passed":
// remova o test.fail() e atualize docs/qa-processo-de-teste.md + backlog.md.

test.describe('Profissional: débitos conhecidos', () => {
  test('[DT13] o profissional NÃO deveria ler lancamentos', async ({ api }) => {
    test.fail(true, 'DT13: RLS de lancamentos aberta a qualquer autenticado (staging e produção)')
    const r = await api.get('lancamentos?select=id,paciente&limit=5')
    expect(semDados(r), descrever(r)).toBe(true)
  })

  test('[DT13] o profissional NÃO deveria ler parcelas', async ({ api }) => {
    test.fail(true, 'DT13: RLS de parcelas aberta a qualquer autenticado (staging e produção)')
    const r = await api.get('parcelas?select=id&limit=5')
    expect(semDados(r), descrever(r)).toBe(true)
  })

  test('[DT4] o profissional NÃO deveria abrir /extrato sem permissão do módulo', async ({ page }) => {
    test.fail(true, 'DT4: /extrato não tem guard de módulo e abre para o profissional')
    await page.goto('/')
    expect(await abrirRota(page, '/extrato')).toBe('/sem-acesso')
  })
})
