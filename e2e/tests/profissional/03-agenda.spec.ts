import { test, expect } from '../../fixtures'
import { PROFISSIONAL_ANA_ID } from '../../config'
import { clienteAutenticado } from '../../helpers/api'
import { agendarSessao, cartaoSessao, preencherNovaSessao } from '../../helpers/agenda'
import { criarPacienteQA, nomeQA, outroProfissional, primeiraSalaAtiva } from '../../helpers/dados'
import { abrirRota, campo, dataLocal, modalAberto } from '../../helpers/ui'

const OBS_PROPRIA = nomeQA('Sessao-propria-UI')
const OBS_CONFLITO = nomeQA('Sessao-conflito-profissional')
const OBS_OUTRO = nomeQA('Sessao-outra-prof-admin')
let paciente = ''

test.describe('Profissional: Agenda', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async () => {
    // paciente sintético criado pelo admin (API) para o profissional poder agendar
    paciente = (await criarPacienteQA(await clienteAutenticado('admin'), 'Paciente-Profissional')).nome
  })

  test('o campo Profissional vem preenchido com a Dra. Ana e desabilitado', async ({ page }) => {
    await abrirRota(page, '/agenda')
    await page.getByRole('button', { name: /Nova Sessão/ }).click()
    const modal = modalAberto(page)
    const campoProf = campo(modal, 'Profissional')
    await expect(campoProf).toBeDisabled()
    await expect(campoProf).toHaveValue(PROFISSIONAL_ANA_ID)
    await modal.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('cria sessão própria e ela é gravada para a Dra. Ana', async ({ page, apiAdmin }) => {
    await abrirRota(page, '/agenda')
    await agendarSessao(page, { paciente, data: dataLocal(0), inicio: '05:00', fim: '05:50', observacoes: OBS_PROPRIA })
    await expect(cartaoSessao(page, paciente)).toBeVisible()
    const r = await apiAdmin.get(`sessoes?select=profissional_id,modalidade&observacoes=eq.${OBS_PROPRIA}`, 'psicologia')
    expect(r.body).toHaveLength(1)
    expect(r.body[0].profissional_id).toBe(PROFISSIONAL_ANA_ID)
  })

  test('edita a própria sessão (modalidade -> online)', async ({ page, apiAdmin }) => {
    await abrirRota(page, '/agenda')
    await cartaoSessao(page, paciente).click()
    const modal = modalAberto(page)
    await expect(modal.locator('h2', { hasText: 'Editar Sessão' })).toBeVisible()
    await campo(modal, 'Modalidade').selectOption('online')
    await modal.getByRole('button', { name: 'Salvar', exact: true }).click()
    await modal.locator('h2', { hasText: 'Editar Sessão' }).waitFor({ state: 'detached' })
    await expect.poll(async () => (await apiAdmin.get(`sessoes?select=modalidade&observacoes=eq.${OBS_PROPRIA}`, 'psicologia')).body[0]?.modalidade).toBe('online')
  })

  test('a lixeira de excluir NÃO aparece (modal e cartão) — só o admin exclui (DT14)', async ({ page }) => {
    await abrirRota(page, '/agenda')
    const cartao = cartaoSessao(page, paciente)
    await cartao.hover()
    // Atenção: no código atual o botão do cartão existe no DOM para todos e aparece no hover (group-hover).
    await expect(cartao.locator('button'), 'lixeira no cartão ao passar o mouse').toBeHidden()
    await cartao.click()
    const modal = modalAberto(page)
    await expect(modal.locator('h2', { hasText: 'Editar Sessão' })).toBeVisible()
    await expect(modal.locator('h2', { hasText: 'Editar Sessão' }).locator('xpath=following-sibling::button'), 'lixeira no modal de edição').toHaveCount(0)
    await modal.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('conflito de sala com sessão de OUTRO profissional (enxerga via sala_disponivel)', async ({ page, apiAdmin }) => {
    const sala = await primeiraSalaAtiva(apiAdmin)
    const outro = await outroProfissional(apiAdmin, PROFISSIONAL_ANA_ID)
    // a sessão da outra profissional é criada pelo ADMIN (API); o profissional não a enxerga pela RLS
    const pac = await criarPacienteQA(apiAdmin, 'Paciente-Conflito')
    const criada = await apiAdmin.post('sessoes', {
      paciente_id: pac.id, profissional_id: outro.id, data_sessao: dataLocal(0), hora_inicio: '06:00', hora_fim: '06:50',
      sala_id: sala.id, observacoes: OBS_OUTRO,
    }, 'psicologia')
    expect(criada.status, 'preparação do conflito pelo admin').toBe(201)

    await abrirRota(page, '/agenda')
    await expect(page.getByText(pac.nome), 'o profissional não deve ver a sessão da outra profissional').toHaveCount(0)
    const modal = await preencherNovaSessao(page, {
      paciente, data: dataLocal(0), inicio: '06:30', fim: '07:20', salaNome: sala.nome, observacoes: OBS_CONFLITO,
    })
    await modal.getByRole('button', { name: 'Agendar', exact: true }).click()
    await expect(modal.getByText(/Conflito: a .* já está ocupada/)).toBeVisible()
    const r = await apiAdmin.get(`sessoes?select=id&observacoes=eq.${OBS_CONFLITO}`, 'psicologia')
    expect(r.body, 'a sessão em conflito não pode ter sido gravada').toHaveLength(0)
    await modal.getByRole('button', { name: 'Cancelar' }).click()
  })
})
