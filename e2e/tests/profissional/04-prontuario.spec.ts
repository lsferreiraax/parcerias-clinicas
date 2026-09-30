import { test, expect } from '../../fixtures'
import { descrever } from '../../helpers/api'
import { criarPacienteQA, nomeQA } from '../../helpers/dados'
import { dataLocal } from '../../helpers/ui'
import { clienteAutenticado } from '../../helpers/api'
import { lerSessao } from '../../helpers/sessao'

// Prontuário: leitura só do autor (e do admin). O profissional só cria em nome próprio.

const QUEIXA = nomeQA('Prontuario-profissional')

test.describe('Profissional: prontuário (API)', () => {
  test.describe.configure({ mode: 'serial' })
  let pacienteId = ''

  test('cria prontuário em nome próprio e lê de volta só os próprios', async ({ api, apiAdmin, meuId }) => {
    pacienteId = (await criarPacienteQA(apiAdmin, 'Paciente-Prontuario')).id
    const criado = await api.post('prontuarios', {
      paciente_id: pacienteId, tipo: 'evolucao', data_registro: dataLocal(0), queixa_principal: QUEIXA, criado_por: meuId,
    }, 'psicologia')
    expect(criado.status, descrever(criado)).toBe(201)

    const lidos = await api.get('prontuarios?select=id,criado_por&limit=1000', 'psicologia')
    expect(lidos.status).toBe(200)
    expect(lidos.body.length).toBeGreaterThan(0)
    expect(lidos.body.filter((p: { criado_por: string }) => p.criado_por !== meuId), 'prontuários de outros autores').toEqual([])
  })

  test('não cria prontuário em nome de outro usuário (403)', async ({ api, apiAdmin }) => {
    const adminId = lerSessao('admin').userId
    const r = await api.post('prontuarios', {
      paciente_id: pacienteId, tipo: 'evolucao', data_registro: dataLocal(0), queixa_principal: nomeQA('Prontuario-em-nome-de-outro'), criado_por: adminId,
    }, 'psicologia')
    expect(r.status, descrever(r)).toBe(403)
    const existe = await apiAdmin.get(`prontuarios?select=id&queixa_principal=like.${encodeURIComponent('QA-Prontuario-em-nome-de-outro*')}`, 'psicologia')
    expect(existe.body).toHaveLength(0)
  })

  test('o admin enxerga o prontuário do profissional (e o financeiro/recepcionista não)', async ({ apiAdmin }) => {
    const adm = await apiAdmin.get(`prontuarios?select=id&queixa_principal=eq.${QUEIXA}`, 'psicologia')
    expect(adm.body).toHaveLength(1)
    for (const perfil of ['financeiro', 'recepcionista'] as const) {
      const outro = await (await clienteAutenticado(perfil)).get(`prontuarios?select=id&queixa_principal=eq.${QUEIXA}`, 'psicologia')
      expect([200, 401, 403], `${perfil}: ${descrever(outro)}`).toContain(outro.status)
      if (outro.status === 200) expect(outro.body, `${perfil} não pode ler prontuário alheio`).toHaveLength(0)
    }
  })
})
