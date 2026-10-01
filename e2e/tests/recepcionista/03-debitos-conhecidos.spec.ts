import { test, expect } from '../../fixtures'
import { descrever, semDados } from '../../helpers/api'
import { abrirRota } from '../../helpers/ui'

// Débitos conhecidos (test.fail): ver instruções no topo de tests/profissional/05-debitos-conhecidos.spec.ts.

test.describe('Recepcionista: débitos conhecidos', () => {
  test('[DT4] a recepcionista NÃO deveria abrir /extrato sem permissão do módulo', async ({ page }) => {
    test.fail(true, 'DT4: /extrato não tem guard de módulo e abre (com valores de repasse) para a recepcionista')
    await page.goto('/')
    expect(await abrirRota(page, '/extrato')).toBe('/sem-acesso')
  })

  test('[DT13 corrigido na 038] a recepcionista NÃO deveria ler lancamentos pela API', async ({ api }) => {
    const r = await api.get('lancamentos?select=id,paciente&limit=5')
    expect(semDados(r), descrever(r)).toBe(true)
  })

  test('[DT13 corrigido na 038] a recepcionista NÃO deveria ler parcelas pela API', async ({ api }) => {
    const r = await api.get('parcelas?select=id&limit=5')
    expect(semDados(r), descrever(r)).toBe(true)
  })
})
