import { test, expect } from '../../fixtures'
import { PROFISSIONAL_ANA_ID } from '../../config'
import { descrever, semDados } from '../../helpers/api'
import { agendarSessao, cartaoSessao } from '../../helpers/agenda'
import { nomeQA, outroProfissional } from '../../helpers/dados'
import { abrirRota, campo, dataLocal, modalAberto } from '../../helpers/ui'

const PACIENTE = nomeQA('Paciente-Recepcionista')
const OBS_OUTRO = nomeQA('Sessao-recepcionista-outro')
const OBS_ANA = nomeQA('Sessao-recepcionista-ana')

test.describe('Recepcionista (role gestor): pacientes e agenda', () => {
  test.describe.configure({ mode: 'serial' })

  test('cadastra paciente QA- pela tela', async ({ page, api }) => {
    await abrirRota(page, '/pacientes')
    await page.getByRole('button', { name: /Novo Paciente/ }).click()
    const modal = modalAberto(page)
    await modal.getByPlaceholder('Nome do paciente').fill(PACIENTE)
    await modal.getByRole('button', { name: 'Cadastrar' }).click()
    await modal.locator('h2', { hasText: 'Novo Paciente' }).waitFor({ state: 'detached' })
    const r = await api.get(`pacientes?select=id&nome=eq.${encodeURIComponent(PACIENTE)}`)
    expect(r.body).toHaveLength(1)
  })

  test('agenda sessão para QUALQUER profissional (outra e a Dra. Ana)', async ({ page, apiAdmin }) => {
    const outro = await outroProfissional(apiAdmin, PROFISSIONAL_ANA_ID)
    const ana = await apiAdmin.get(`profissionais?select=nome&id=eq.${PROFISSIONAL_ANA_ID}`)
    await abrirRota(page, '/agenda')

    // o campo Profissional fica habilitado (não há vínculo)
    await page.getByRole('button', { name: /Nova Sessão/ }).click()
    await expect(campo(modalAberto(page), 'Profissional')).toBeEnabled()
    await modalAberto(page).getByRole('button', { name: 'Cancelar' }).click()

    await agendarSessao(page, { paciente: PACIENTE, profissional: outro.nome, data: dataLocal(0), inicio: '05:00', fim: '05:50', observacoes: OBS_OUTRO })
    await agendarSessao(page, { paciente: PACIENTE, profissional: ana.body[0].nome, data: dataLocal(0), inicio: '06:00', fim: '06:50', observacoes: OBS_ANA })
    await expect(cartaoSessao(page, PACIENTE)).toBeVisible()

    const r = await apiAdmin.get(`sessoes?select=observacoes,profissional_id&observacoes=in.(${OBS_OUTRO},${OBS_ANA})`, 'psicologia')
    const porObs = Object.fromEntries(r.body.map((s: { observacoes: string; profissional_id: string }) => [s.observacoes, s.profissional_id]))
    expect(porObs[OBS_OUTRO]).toBe(outro.id)
    expect(porObs[OBS_ANA]).toBe(PROFISSIONAL_ANA_ID)
  })

  test('vê as sessões de TODOS os profissionais (mesmo conjunto que o admin)', async ({ api, apiAdmin }) => {
    const minhas = await api.get('sessoes?select=id,profissional_id&limit=5000', 'psicologia')
    const todas = await apiAdmin.get('sessoes?select=id,profissional_id&limit=5000', 'psicologia')
    expect(minhas.status, descrever(minhas)).toBe(200)
    const ids = (r: { body: { id: string }[] }) => r.body.map(s => s.id).sort()
    expect(ids(minhas)).toEqual(ids(todas))
    const profissionais = new Set(minhas.body.map((s: { profissional_id: string }) => s.profissional_id))
    expect(profissionais.size, 'mais de um profissional nas sessões visíveis').toBeGreaterThan(1)
  })

  test('não lê prontuários (RLS: só o autor)', async ({ api }) => {
    const r = await api.get('prontuarios?select=id&limit=5', 'psicologia')
    expect(semDados(r), descrever(r)).toBe(true)
  })
})
