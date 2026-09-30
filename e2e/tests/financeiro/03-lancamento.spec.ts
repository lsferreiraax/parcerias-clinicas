import { test, expect } from '../../fixtures'
import { criarLancamentoPelaTela } from '../../helpers/financeiro'
import { nomeQA } from '../../helpers/dados'
import { dataLocal } from '../../helpers/ui'

// O financeiro não consegue apagar: o lançamento QA- é removido pelo teardown do admin.

test.describe('Financeiro: lançamento', () => {
  test('cria lançamento QA- pela tela e ele aparece na lista e na API', async ({ page, api, coletor }) => {
    const paciente = nomeQA('Paciente-Financeiro')
    await criarLancamentoPelaTela(page, { paciente, data: dataLocal(-5), parcelas: 2, valor: 200 })
    await page.getByPlaceholder('Buscar paciente...').fill(paciente)
    await expect(page.locator('table tbody tr', { hasText: paciente })).toHaveCount(1)

    const r = await api.get(`lancamentos?select=id,num_parcelas&paciente=eq.${encodeURIComponent(paciente)}`)
    expect(r.body).toHaveLength(1)
    const parcelas = await api.get(`parcelas?select=parcela_num&lancamento_id=eq.${r.body[0].id}`)
    expect(parcelas.body).toHaveLength(2)
    expect(coletor.resumoApi(), 'erros de API durante a criação').toEqual([])
  })
})
