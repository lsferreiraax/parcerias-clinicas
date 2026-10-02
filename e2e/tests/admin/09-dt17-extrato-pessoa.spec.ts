import { test, expect } from '../../fixtures'
import { aguardarRede, abrirRota, dataLocal } from '../../helpers/ui'
import { duasPsi1, inserirLancamentoQA, listarParcerias, nomeLanc } from '../../helpers/dt17'

// DT17 (admin): select "Pessoa" no Extrato (id extrato-pessoa). Dados: 3 lançamentos QA-DT17-Admin-* (Ana 100, outra 200, sem pessoa 300).

test.describe('DT17 admin: Extrato com seletor de pessoa', () => {
  test('por tipo mostra as 3 linhas; por pessoa mostra só as da pessoa; voltar a "todas as cotas" restaura', async ({ page, apiAdmin, coletor }) => {
    const { ana, outra } = await duasPsi1(apiAdmin)
    const parceria = (await listarParcerias(apiAdmin))[0]
    const nA = nomeLanc('Admin-Ana')
    const nF = nomeLanc('Admin-Outra')
    const nS = nomeLanc('Admin-SemPessoa')
    const mk = (paciente: string, valor: number, pessoa: string | null) =>
      inserirLancamentoQA(apiAdmin, { paciente, parceria_id: parceria.id, valores: { psi1: valor }, pessoas: { psi1: pessoa }, data: dataLocal(-1) })
    await mk(nA, 100, ana.id)
    await mk(nF, 200, outra.id)
    await mk(nS, 300, null)

    await abrirRota(page, '/extrato')
    await page.getByRole('button', { name: 'Psi1', exact: true }).click()
    const linha = (n: string) => page.locator('main table tbody tr', { hasText: n })
    await expect(linha(nA)).toHaveCount(1)
    await expect(linha(nF)).toHaveCount(1)
    await expect(linha(nS)).toHaveCount(1)

    const sel = page.locator('#extrato-pessoa')
    await expect(sel).toBeVisible()
    await sel.selectOption(outra.id)
    await aguardarRede(page)
    await expect(linha(nF)).toHaveCount(1)
    await expect(linha(nF).first()).toContainText('200,00')
    await expect(linha(nA)).toHaveCount(0)
    await expect(linha(nS), 'sem pessoa só aparece por tipo').toHaveCount(0)
    await expect(page.locator('main h2', { hasText: `Lançamentos — ${outra.nome}` })).toBeVisible()

    await sel.selectOption(ana.id)
    await aguardarRede(page)
    await expect(linha(nA)).toHaveCount(1)
    await expect(linha(nF)).toHaveCount(0)

    await sel.selectOption('')
    await aguardarRede(page)
    await expect(linha(nS)).toHaveCount(1)
    await expect(linha(nA)).toHaveCount(1)
    await expect(linha(nF)).toHaveCount(1)

    // trocar de tipo zera a pessoa e mostra as pessoas do outro tipo (nenhuma psi1 na lista de camta)
    await page.getByRole('button', { name: 'Camta', exact: true }).click()
    const nomesOpcoes = await page.locator('#extrato-pessoa option').allTextContents()
    expect(nomesOpcoes.join('|')).not.toContain(outra.nome)
    expect(coletor.resumoApi(), 'sem erro de API na tela').toEqual([])
  })
})
