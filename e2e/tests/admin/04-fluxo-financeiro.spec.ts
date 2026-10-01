import { test, expect } from '../../fixtures'
import { criarLancamentoPelaTela, filtrarParcelas, linhaParcela, ROTULO_ABA_REPASSE } from '../../helpers/financeiro'
import { nomeQA } from '../../helpers/dados'
import { abrirRota, dataLocal, modalAberto } from '../../helpers/ui'

// Fluxo financeiro ponta a ponta como admin (dados "QA-", apagados pelo teardown em cascata).
// Lançamento com data PASSADA (-75 dias) => as 3 parcelas nascem vencidas (permite renegociar).

const PACIENTE = nomeQA('Paciente-Fluxo')
const PACIENTE_FUTURO = nomeQA('Paciente-Futuro')
let lancamentoId = ''
let repasse: { id: string; tipo: string } | null = null

test.describe('Admin: fluxo financeiro ponta a ponta', () => {
  test.describe.configure({ mode: 'serial' })

  test('1. cria lançamento parcelado QA- (3x, data passada)', async ({ page, apiAdmin }) => {
    await criarLancamentoPelaTela(page, { paciente: PACIENTE, data: dataLocal(-75), parcelas: 3, valor: 300 })
    await page.getByPlaceholder('Buscar paciente...').fill(PACIENTE)
    const linha = page.locator('table tbody tr', { hasText: PACIENTE })
    await expect(linha).toHaveCount(1)
    await expect(linha).toContainText('Parcelado 3x')

    const r = await apiAdmin.get(`lancamentos?select=id,num_parcelas,valor_total&paciente=eq.${encodeURIComponent(PACIENTE)}`)
    expect(r.body).toHaveLength(1)
    expect(r.body[0].num_parcelas).toBe(3)
    lancamentoId = r.body[0].id
  })

  test('2. as 3 parcelas foram geradas (pendentes e vencidas)', async ({ page, apiAdmin }) => {
    const r = await apiAdmin.get(`parcelas?select=parcela_num,parcela_total,status&lancamento_id=eq.${lancamentoId}&order=parcela_num`)
    expect(r.body.map((p: { parcela_num: number }) => p.parcela_num)).toEqual([1, 2, 3])
    expect(r.body.every((p: { status: string }) => p.status === 'pendente')).toBe(true)

    const linhas = await filtrarParcelas(page, PACIENTE)
    await expect(linhas).toHaveCount(3)
    await expect(linhas.filter({ hasText: 'vencida' })).toHaveCount(3)
  })

  test('3. baixa a parcela 1', async ({ page, apiAdmin }) => {
    const linhas = await filtrarParcelas(page, PACIENTE)
    // A tela tem tabela (desktop) e cards (mobile, md:hidden) no DOM; a tabela é a visível em 1366px.
    // A baixa é direta (sem modal de confirmação): o botão chama a mutation e a linha passa a "pago".
    const p1 = linhaParcela(linhas, 1)
    await expect(p1).toHaveCount(1)
    await expect(p1.getByRole('cell', { name: 'vencida', exact: true })).toBeVisible()
    const baixa = page.waitForResponse(r => r.url().includes('/rest/v1/parcelas') && ['PATCH', 'POST'].includes(r.request().method()), { timeout: 30_000 })
    await p1.getByRole('button', { name: 'Marcar como pago' }).click()
    expect((await baixa).ok(), 'resposta da baixa da parcela').toBe(true)
    await expect(p1.getByRole('cell', { name: 'pago', exact: true })).toBeVisible({ timeout: 20_000 })
    const r = await apiAdmin.get(`parcelas?select=status&lancamento_id=eq.${lancamentoId}&parcela_num=eq.1`)
    expect(r.body[0].status).toBe('pago')
  })

  test('4. o repasse do lançamento existe e está não conciliado', async ({ apiAdmin }) => {
    const r = await apiAdmin.get(`repasses?select=id,tipo,status,valor_repasse&lancamento_id=eq.${lancamentoId}&order=tipo`)
    expect(r.body.length, 'repasses do lançamento').toBeGreaterThan(0)
    const pendentes = r.body.filter((x: { status: string; valor_repasse: number }) => x.status === 'nao_conciliado' && Number(x.valor_repasse) > 0)
    expect(pendentes.length, 'repasses não conciliados com valor').toBeGreaterThan(0)
    repasse = { id: pendentes[0].id, tipo: pendentes[0].tipo }
  })

  test('5. concilia o repasse', async ({ page, apiAdmin }) => {
    test.skip(!repasse, 'sem repasse não conciliado do lançamento (passo 4)')
    await abrirRota(page, '/repasses')
    await page.getByRole('button', { name: ROTULO_ABA_REPASSE[repasse!.tipo], exact: true }).click()
    await page.getByPlaceholder('Nome do paciente...').fill(PACIENTE)
    const linha = page.locator('table tbody tr', { hasText: PACIENTE })
    await expect(linha.first()).toBeVisible()
    await linha.first().getByTitle('Conciliar').click()
    const modal = modalAberto(page)
    await expect(modal.locator('h2', { hasText: 'Conciliar Repasse' })).toBeVisible()
    await modal.getByRole('button', { name: /Confirmar Conciliação/ }).click()
    await modal.locator('h2', { hasText: 'Conciliar Repasse' }).waitFor({ state: 'detached' })
    await expect.poll(async () => (await apiAdmin.get(`repasses?select=status&id=eq.${repasse!.id}`)).body[0]?.status).toBe('conciliado')
  })

  test('6. renegocia a parcela vencida 2/3', async ({ page, apiAdmin }) => {
    const linhas = await filtrarParcelas(page, PACIENTE)
    const p2 = linhaParcela(linhas, 2)
    await p2.getByRole('button', { name: 'Renegociar' }).click()
    const form = page.locator('form')
    await form.locator('input[type="date"]').fill(dataLocal(10))
    await form.locator('textarea').fill('QA-renegociação automática')
    await form.getByRole('button', { name: /Confirmar Renegociação/ }).click()
    await expect(form).toHaveCount(0)
    await expect(p2).toContainText('renegociada')
    const r = await apiAdmin.get(`parcelas?select=status&lancamento_id=eq.${lancamentoId}&parcela_num=eq.2`)
    expect(r.body[0].status).toBe('renegociada')
  })

  test('7. só parcela vencida pode ser renegociada (lançamento com data de hoje não oferece o botão)', async ({ page }) => {
    await criarLancamentoPelaTela(page, { paciente: PACIENTE_FUTURO, data: dataLocal(0), parcelas: 3, valor: 300 })
    const linhas = await filtrarParcelas(page, PACIENTE_FUTURO)
    await expect(linhas).toHaveCount(3)
    await expect(linhas.filter({ hasText: 'vencida' })).toHaveCount(0)
    await expect(linhas.getByTitle('Renegociar')).toHaveCount(0)
    // e o cancelamento de parcela (admin) continua disponível nas pendentes
    await expect(linhas.getByTitle('Cancelar parcela')).toHaveCount(3)
  })

  // DT3: o KPI/aba "Renegociadas" só atualiza após recarregar (renegociarParcela invalida apenas ['parcelas']).
  // Quando for corrigido este teste PASSA e o Playwright acusa "esperava falhar": remova o test.fail().
  test('8. [DT3] KPI "Renegociadas" atualiza sem recarregar', async ({ page }) => {
    test.fail(true, 'DT3: KPI e aba "Renegociadas" só atualizam após recarregar')
    const linhas = await filtrarParcelas(page, PACIENTE)
    const kpi = page.locator('p', { hasText: /^Renegociadas$/ }).locator('xpath=following-sibling::p[1]')
    await expect(kpi).toHaveText(/\d+/)
    const antes = Number(await kpi.innerText())
    const p3 = linhaParcela(linhas, 3)
    await p3.getByRole('button', { name: 'Renegociar' }).click()
    const form = page.locator('form')
    await form.locator('input[type="date"]').fill(dataLocal(20))
    await form.locator('textarea').fill('QA-renegociação DT3')
    await form.getByRole('button', { name: /Confirmar Renegociação/ }).click()
    await expect(form).toHaveCount(0)
    await expect(p3).toContainText('renegociada')
    await expect(kpi, 'KPI Renegociadas sem recarregar').toHaveText(String(antes + 1), { timeout: 4000 })
  })
})
