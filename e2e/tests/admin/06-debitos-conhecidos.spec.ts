import { test, expect } from '../../fixtures'
import { acharUuids } from '../../helpers/uuid'
import { abrirRota, modalAberto } from '../../helpers/ui'

// Débitos conhecidos do perfil admin. Cada teste com test.fail() documenta o comportamento CORRETO:
// hoje ele falha (esperado). Quando o débito for corrigido, o teste passa e o Playwright acusa
// "Expected to fail, but passed" -> remova o test.fail() e o registro do débito em docs/qa-processo-de-teste.md.

test.describe('Admin: débitos conhecidos', () => {
  test('[DT8] o select "Parceria" do formulário de sessão não mostra UUID', async ({ page }) => {
    test.fail(true, 'DT8: select "Parceria" da Agenda mostra "uuid — Nome"; exibir só o nome')
    await abrirRota(page, '/agenda')
    await page.getByRole('button', { name: /Nova Sessão/ }).click()
    const modal = modalAberto(page)
    const select = modal.locator('select:has(option[value=""]:text-is("Sem vínculo"))')
    await expect(select).toHaveCount(1)
    const textos = (await select.locator('option').allInnerTexts()).join('\n')
    expect(acharUuids(textos), 'UUIDs nas opções do select Parceria').toEqual([])
  })
})
