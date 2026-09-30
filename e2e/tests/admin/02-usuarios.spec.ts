import { test, expect } from '../../fixtures'
import { EMAILS } from '../../config'
import { campo, modalAberto, abrirRota } from '../../helpers/ui'

test.describe('Admin: tela Usuários', () => {
  test('coluna "Perfil de Acesso" preenchida para os 4 usuários de teste (DT10)', async ({ page }) => {
    await page.goto('/usuarios')
    await expect(page.getByRole('columnheader', { name: 'Perfil de Acesso' })).toBeVisible()
    for (const email of Object.values(EMAILS)) {
      const linha = page.locator('tbody tr', { hasText: email })
      await expect(linha, `linha de ${email}`).toHaveCount(1)
      const perfil = (await linha.locator('td').nth(3).innerText()).trim()
      expect(perfil, `Perfil de Acesso de ${email}`).not.toBe('—')
      expect(perfil).not.toBe('')
    }
  })

  test('alerta "sem vínculo", campo "Profissional vinculado" por tipo e validação sem salvar', async ({ page, apiAdmin }) => {
    // Simula (só na resposta da tela; nada é gravado) o usuário profissional@ sem vínculo.
    await page.route('**/rest/v1/rpc/listar_perfis_com_email', async route => {
      const resp = await route.fetch()
      const linhas = (await resp.json()) as Array<Record<string, unknown>>
      for (const u of linhas) {
        if (u.email === EMAILS.profissional) u.profissional_id = null
      }
      await route.fulfill({ response: resp, json: linhas })
    })
    const escritas: string[] = []
    page.on('request', r => {
      if (['PATCH', 'POST', 'DELETE', 'PUT'].includes(r.method()) && r.url().includes('/rest/v1/')) escritas.push(`${r.method()} ${r.url()}`)
    })

    await page.goto('/usuarios')
    const linha = page.locator('tbody tr', { hasText: EMAILS.profissional })
    await expect(linha.getByText('sem vínculo')).toBeVisible()

    await linha.getByTitle('Editar').click()
    const modal = modalAberto(page)
    await expect(modal.locator('h2', { hasText: 'Editar Usuário' })).toBeVisible()

    const esperados = async (tipo: string) => {
      const r = await apiAdmin.get(`profissionais?select=nome&ativo=eq.true&tipo=eq.${tipo}&order=nome`)
      return (r.body as { nome: string }[]).map(p => p.nome).sort()
    }
    const opcoes = async () => {
      const textos = await campo(modal, 'Profissional vinculado').locator('option').allInnerTexts()
      return textos.filter(t => t.trim() !== 'Selecione...').map(t => t.trim()).sort()
    }

    await campo(modal, 'Tipo do Profissional').selectOption('psi1')
    expect(await opcoes(), 'opções para tipo psi1').toEqual(await esperados('psi1'))
    await campo(modal, 'Tipo do Profissional').selectOption('medico')
    expect(await opcoes(), 'opções para tipo medico').toEqual(await esperados('medico'))

    // Validação: role profissional + tipo, sem profissional vinculado => não salva.
    await campo(modal, 'Tipo do Profissional').selectOption('psi1')
    await modal.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(modal.getByText(/Vincule o usuário a um profissional/)).toBeVisible()
    expect(escritas, 'nenhuma escrita deve ter sido enviada ao salvar com validação falha').toEqual([])

    await modal.getByRole('button', { name: 'Cancelar' }).click()
    await abrirRota(page, '/usuarios')
  })
})
