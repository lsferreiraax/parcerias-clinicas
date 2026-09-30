import { test, expect } from '../../fixtures'
import { PROFISSIONAL_ANA_ID } from '../../config'
import { agendarSessao, cartaoSessao, preencherNovaSessao } from '../../helpers/agenda'
import { nomeQA, outroProfissional, primeiraSalaAtiva } from '../../helpers/dados'
import { abrirRota, campo, dataLocal, modalAberto } from '../../helpers/ui'

// Fluxo completo de Psicologia como admin. Dados sintéticos "QA-" (apagados pelo teardown).

const PACIENTE = nomeQA('Paciente-Admin')
const OBS_OUTRO = nomeQA('Sessao-outro-prof')
const OBS_SALA_1 = nomeQA('Sessao-sala-1')
const OBS_SALA_2 = nomeQA('Sessao-sala-2-conflito')

test.describe('Admin: Psicologia', () => {
  test.describe.configure({ mode: 'serial' })

  test('cadastra um paciente QA-', async ({ page, apiAdmin }) => {
    await abrirRota(page, '/pacientes')
    await page.getByRole('button', { name: /Novo Paciente/ }).click()
    const modal = modalAberto(page)
    await modal.getByPlaceholder('Nome do paciente').fill(PACIENTE)
    await modal.getByRole('button', { name: 'Cadastrar' }).click()
    await modal.locator('h2', { hasText: 'Novo Paciente' }).waitFor({ state: 'detached' })

    await page.getByPlaceholder(/Buscar por nome/).fill(PACIENTE)
    await expect(page.getByText(PACIENTE, { exact: true })).toBeVisible()
    const r = await apiAdmin.get(`pacientes?select=id,nome&nome=eq.${encodeURIComponent(PACIENTE)}`)
    expect(r.body).toHaveLength(1)
  })

  test('agenda sessão para QUALQUER profissional (outra que não a vinculada ao profissional@)', async ({ page, apiAdmin }) => {
    const outro = await outroProfissional(apiAdmin, PROFISSIONAL_ANA_ID)
    await abrirRota(page, '/agenda')
    await agendarSessao(page, {
      paciente: PACIENTE, profissional: outro.nome, data: dataLocal(0), inicio: '05:00', fim: '05:50', observacoes: OBS_OUTRO,
    })
    await expect(cartaoSessao(page, PACIENTE)).toBeVisible()
    const r = await apiAdmin.get(`sessoes?select=profissional_id&observacoes=eq.${OBS_OUTRO}`, 'psicologia')
    expect(r.body).toHaveLength(1)
    expect(r.body[0].profissional_id).toBe(outro.id)
  })

  test('conflito de sala: a segunda sessão na mesma sala/horário é barrada', async ({ page, apiAdmin }) => {
    const sala = await primeiraSalaAtiva(apiAdmin)
    await abrirRota(page, '/agenda')
    await agendarSessao(page, {
      paciente: PACIENTE, profissional: (await outroProfissional(apiAdmin, PROFISSIONAL_ANA_ID)).nome,
      data: dataLocal(0), inicio: '06:00', fim: '06:50', salaNome: sala.nome, observacoes: OBS_SALA_1,
    })

    const modal = await preencherNovaSessao(page, {
      paciente: PACIENTE, profissional: (await outroProfissional(apiAdmin, PROFISSIONAL_ANA_ID)).nome,
      data: dataLocal(0), inicio: '06:30', fim: '07:20', salaNome: sala.nome, observacoes: OBS_SALA_2,
    })
    await modal.getByRole('button', { name: 'Agendar', exact: true }).click()
    await expect(modal.getByText(/Conflito: a .* já está ocupada/)).toBeVisible()
    const r = await apiAdmin.get(`sessoes?select=id&observacoes=eq.${OBS_SALA_2}`, 'psicologia')
    expect(r.body, 'a sessão em conflito não pode ter sido gravada').toHaveLength(0)
    await modal.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('o admin vê a lixeira de excluir ao editar uma sessão', async ({ page }) => {
    await abrirRota(page, '/agenda')
    await cartaoSessao(page, PACIENTE).click()
    const modal = modalAberto(page)
    await expect(modal.locator('h2', { hasText: 'Editar Sessão' })).toBeVisible()
    await expect(modal.locator('button:has(svg.lucide-trash-2)')).toHaveCount(1)
    await modal.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('Dashboard Psicologia e Grade de Salas abrem sem erro de API', async ({ page, coletor }) => {
    for (const rota of ['/dashboard-psicologia', '/grade-salas']) {
      coletor.limpar()
      expect(await abrirRota(page, rota)).toBe(rota)
      await expect(page.locator('main h1').first()).toBeVisible()
      expect(coletor.resumoApi(), `erros de API em ${rota}`).toEqual([])
    }
  })
})
