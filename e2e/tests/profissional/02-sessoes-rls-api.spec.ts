import { test, expect } from '../../fixtures'
import { PROFISSIONAL_ANA_ID } from '../../config'
import { descrever } from '../../helpers/api'
import { criarPacienteQA, nomeQA, outroProfissional } from '../../helpers/dados'
import { dataLocal } from '../../helpers/ui'

// Profissional vinculado à Dra. Ana Lima: a RLS isola por PESSOA (profissional_id), não por tipo.

test.describe('Profissional: isolamento de sessões pela API', () => {
  test('GET sessoes devolve só sessões do profissional_id da Dra. Ana Lima', async ({ api }) => {
    const r = await api.get('sessoes?select=id,profissional_id&limit=1000', 'psicologia')
    expect(r.status, descrever(r)).toBe(200)
    expect(r.body.length, 'a Dra. Ana tem sessões no seed').toBeGreaterThan(0)
    const outros = r.body.filter((s: { profissional_id: string }) => s.profissional_id !== PROFISSIONAL_ANA_ID)
    expect(outros, 'sessões de outros profissionais visíveis').toEqual([])
  })

  test('POST de sessão para OUTRA profissional é negado (403)', async ({ api, apiAdmin }) => {
    const outro = await outroProfissional(apiAdmin, PROFISSIONAL_ANA_ID)
    const pac = await criarPacienteQA(apiAdmin, 'Paciente-RLS-profissional')
    const r = await api.post('sessoes', {
      paciente_id: pac.id, profissional_id: outro.id, data_sessao: dataLocal(30), hora_inicio: '08:00',
      observacoes: nomeQA('Sessao-indevida-profissional'),
    }, 'psicologia')
    expect(r.status, descrever(r)).toBe(403)
  })

  test('POST de sessão PRÓPRIA é aceito; DELETE é negado (só admin apaga)', async ({ api, apiAdmin }) => {
    const pac = await criarPacienteQA(apiAdmin, 'Paciente-RLS-propria')
    const obs = nomeQA('Sessao-propria-API')
    const criada = await api.post('sessoes', {
      paciente_id: pac.id, profissional_id: PROFISSIONAL_ANA_ID, data_sessao: dataLocal(30), hora_inicio: '08:00', observacoes: obs,
    }, 'psicologia')
    expect(criada.status, descrever(criada)).toBe(201)
    const id = criada.body[0].id
    const del = await api.delete(`sessoes?id=eq.${id}`, 'psicologia')
    // RLS de DELETE filtra tudo: 200/204 com 0 linhas afetadas, ou 403. A sessão tem que continuar existindo.
    expect([200, 204, 403], descrever(del)).toContain(del.status)
    const ainda = await apiAdmin.get(`sessoes?select=id&id=eq.${id}`, 'psicologia')
    expect(ainda.body, 'a sessão não pode ter sido apagada pelo profissional').toHaveLength(1)
  })
})
