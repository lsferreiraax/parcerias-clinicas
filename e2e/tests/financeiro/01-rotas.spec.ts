import { test, expect } from '../../fixtures'
import { abrirRota, itensDoMenu } from '../../helpers/ui'
import { PERFIS } from '../../helpers/rotas'

test.describe('Financeiro: rotas', () => {
  test('as 9 rotas financeiras abrem e o menu tem 9 itens', async ({ page }) => {
    const rotas = PERFIS.financeiro.permitidas
    expect(rotas).toHaveLength(9)
    await page.goto('/')
    for (const rota of rotas) {
      expect.soft(await abrirRota(page, rota), `rota ${rota}`).toBe(rota)
      await expect.soft(page.locator('main h1').first()).toBeVisible()
    }
    expect(await itensDoMenu(page)).toHaveLength(9)
  })

  for (const rota of ['/agenda', '/pacientes', '/dashboard-psicologia', '/grade-salas']) {
    test(`${rota} vai para /sem-acesso (módulo psicologia/salas não liberado)`, async ({ page }) => {
      await page.goto('/')
      expect(await abrirRota(page, rota)).toBe('/sem-acesso')
      await expect(page.locator('main h1')).toHaveText(/Acesso Restrito/)
    })
  }
})
