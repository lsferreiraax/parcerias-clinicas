import { test, expect } from '../../fixtures'
import { abrirRota, itensDoMenu } from '../../helpers/ui'

test.describe('Recepcionista (role gestor): menu e rotas', () => {
  test('menu com 4 itens (Pacientes, Agenda, Psicologia, Grade de Salas)', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/agenda')
    const textos = (await itensDoMenu(page)).map(i => i.texto).sort()
    expect(textos).toEqual(['Agenda', 'Grade de Salas', 'Pacientes', 'Psicologia'])
  })

  test('/prontuario e as telas financeiras ficam bloqueadas', async ({ page }) => {
    await page.goto('/')
    for (const rota of ['/prontuario', '/', '/lancamentos', '/parcelas', '/repasses', '/relatorios', '/conta-corrente']) {
      const final = await abrirRota(page, rota)
      expect.soft(final, `${rota} terminou em ${final}`).toBe('/sem-acesso')
    }
  })
})
