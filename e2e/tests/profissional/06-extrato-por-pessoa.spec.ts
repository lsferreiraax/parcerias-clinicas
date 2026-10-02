import { test, expect } from '../../fixtures'
import { aguardarRede, abrirRota, dataLocal } from '../../helpers/ui'
import { duasPsi1, inserirLancamentoQA, listarParcerias, nomeLanc } from '../../helpers/dt17'

// DT17 (profissional@, vinculado à Dra. Ana Lima, psi1): duas psi1 ativas no staging. Cada pessoa vê só o que é dela.
// Dados (criados pelo admin pela API): QA-DT17-Tela-Ana (100, Ana), QA-DT17-Tela-Fernanda (200, outra psi1), QA-DT17-Tela-SemPessoa (300).

test.describe('DT17 profissional: Extrato por pessoa na tela', () => {
  test('vê só o próprio lançamento; não vê o da outra psi1 nem o sem pessoa; sem seletor de pessoa/tipo', async ({ page, apiAdmin, coletor }) => {
    const { ana, outra } = await duasPsi1(apiAdmin)
    const parceria = (await listarParcerias(apiAdmin))[0]
    const nA = nomeLanc('Tela-Ana')
    const nF = nomeLanc('Tela-Outra')
    const nS = nomeLanc('Tela-SemPessoa')
    const mk = (paciente: string, valor: number, pessoa: string | null) =>
      inserirLancamentoQA(apiAdmin, { paciente, parceria_id: parceria.id, valores: { psi1: valor }, pessoas: { psi1: pessoa }, data: dataLocal(-1) })
    await mk(nA, 100, ana.id)
    await mk(nF, 200, outra.id)
    await mk(nS, 300, null)

    await abrirRota(page, '/extrato')
    await aguardarRede(page)
    const main = page.locator('main')
    await expect(main.locator('table tbody tr', { hasText: nA }), 'lançamento da Ana aparece').toHaveCount(1)
    await expect(main.locator('table tbody tr', { hasText: nA }).first()).toContainText('100,00')
    await expect(main.locator('table tbody tr', { hasText: nF }), 'lançamento da outra psi1 NÃO aparece').toHaveCount(0)
    await expect(main.locator('table tbody tr', { hasText: nS }), 'lançamento sem pessoa NÃO aparece').toHaveCount(0)
    await expect(page.locator('#extrato-pessoa'), 'profissional não tem seletor de pessoa').toHaveCount(0)
    await expect(main.getByRole('button', { name: 'Camta', exact: true }), 'nem seletor de tipo').toHaveCount(0)
    expect(coletor.resumoApi(), 'sem erro de API na tela').toEqual([])
  })
})
