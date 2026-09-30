import { test, expect } from '@playwright/test'
import { abrirRota, rolagemHorizontal } from '../../helpers/ui'

// Projeto "mobile": viewport 375px com a sessão do admin.

test.describe('Mobile 375px (admin)', () => {
  test('menu hambúrguer abre o drawer e navega', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside').first()).toBeHidden() // sidebar desktop escondida
    await page.getByLabel('Abrir menu').click()
    const drawer = page.locator('aside').nth(1)
    await expect(drawer.locator('nav a')).toHaveCount(19)
    await drawer.getByRole('link', { name: 'Lançamentos' }).click()
    await expect(page).toHaveURL(/\/lancamentos$/)
    await expect(page.getByLabel('Abrir menu')).toBeVisible()
  })

  test('Lançamentos usa a versão em cards (tabela escondida) e não rola na horizontal', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/lancamentos')
    await expect(page.locator('table').first()).toBeHidden()
    const s = await rolagemHorizontal(page)
    expect(s.pagina).toBeLessThanOrEqual(1)
    expect(s.conteudo).toBeLessThanOrEqual(1)
  })

  test('Agenda cabe na tela de 375px', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/agenda')
    const s = await rolagemHorizontal(page)
    expect(s.pagina).toBeLessThanOrEqual(1)
    expect(s.conteudo).toBeLessThanOrEqual(1)
  })
})
