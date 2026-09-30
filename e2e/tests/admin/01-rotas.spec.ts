import { test, expect } from '../../fixtures'
import { abrirRota, itensDoMenu } from '../../helpers/ui'
import { PERFIS } from '../../helpers/rotas'

// Perfil admin: a varredura de UUID/API/console das 19 telas está em tests/transversal.
// Aqui ficam as provas específicas de rota do admin.

test.describe('Admin: rotas', () => {
  test('as 19 rotas do admin abrem e o menu tem 19 itens', async ({ page }) => {
    const rotas = PERFIS.admin.permitidas
    expect(rotas).toHaveLength(19)
    await page.goto('/')
    for (const rota of rotas) {
      const final = await abrirRota(page, rota)
      expect.soft(final, `rota ${rota}`).toBe(rota)
      await expect.soft(page.locator('main h1').first(), `título de ${rota}`).toBeVisible()
    }
    expect(await itensDoMenu(page)).toHaveLength(19)
  })

  test('/prontuario redireciona (tela exclusiva do role profissional)', async ({ page }) => {
    await page.goto('/')
    const final = await abrirRota(page, '/prontuario')
    expect(final).toBe('/')
  })
})
