import { test, expect } from '../../fixtures'
import { abrirRota, itensDoMenu } from '../../helpers/ui'

test.describe('Profissional: menu e rotas', () => {
  test('menu com os 4 itens do profissional (Pacientes, Agenda, Psicologia, Prontuário)', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/agenda')
    const textos = (await itensDoMenu(page)).map(i => i.texto.replace(/\d+$/, '').trim()).sort()
    expect(textos).toEqual(['Agenda', 'Pacientes', 'Prontuário', 'Psicologia'])
  })

  test('/prontuario abre para o role profissional', async ({ page }) => {
    await page.goto('/')
    expect(await abrirRota(page, '/prontuario')).toBe('/prontuario')
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30_000 })
  })

  test('telas financeiras e de gestão não abrem (redirect da role)', async ({ page }) => {
    await page.goto('/')
    for (const rota of ['/lancamentos', '/parcelas', '/repasses', '/relatorios', '/usuarios', '/configuracoes']) {
      const final = await abrirRota(page, rota)
      expect.soft(['/extrato', '/sem-acesso'], `${rota} terminou em ${final}`).toContain(final)
    }
  })
})
