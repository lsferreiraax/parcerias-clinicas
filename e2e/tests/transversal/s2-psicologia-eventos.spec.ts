import { test, expect } from '../../fixtures'
import { PROFISSIONAL_ANA_ID } from '../../config'
import { clienteAutenticado, descrever } from '../../helpers/api'
import type { ApiRest } from '../../helpers/api'
import { criarPacienteQA, nomeQA, outroProfissional } from '../../helpers/dados'
import { listarParcerias } from '../../helpers/dt17'
import type { ParceriaDT17 } from '../../helpers/dt17'
import { chamarEdge, descreverFn } from '../../helpers/funcoes'
import { lerSessao } from '../../helpers/sessao'
import { dataLocal } from '../../helpers/ui'

// Onda 0 / S2 (Edge Function psicologia-eventos v3 + migration 044). Roda nos 4 projetos; cada um tem o seu bloco:
//   financeiro    -> 403 (sem acl_editar de psicologia)
//   recepcionista -> edita Psicologia no seed: id invalido -> 400, sessao inexistente -> 404 (se o perfil mudar, espera 403)
//   admin         -> 400/404 e backup-banco com token de usuario -> 401
//   (cenario, rodando no projeto profissional) sessoes QA- da Dra. Ana. Desde a revisao de seguranca (A1/A2):
//     * so quem tem acl_editar('parcerias') E acl_editar('psicologia') GERA o lancamento. Nos seeds (migration 035) o
//       financeiro tem parcerias mas NAO psicologia (403 na funcao), logo so o ADMIN gera. Os casos de geracao
//       (valor/parceria/paciente do banco, rateio, cota psi1 da Ana, parcela unica, idempotencia, concorrencia) usam o
//       token do admin sobre sessoes QA- da Ana (o admin enxerga todas pela RLS);
//     * profissional e recepcionista (so Psicologia) recebem 200 {lancamento_criado:false, pendente_faturamento:true},
//       sem lancamento e sem vinculo;
//     * psicologia.sessoes.lancamento_id e protegido por trigger (migration 044): PATCH/INSERT por authenticated -> 42501.
// Todos os dados criados tem prefixo "QA-" (pacientes, observacoes das sessoes, lancamentos por paciente) e sao
// apagados pelo teardown "limpeza" (helpers/limpeza.ts).

const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000'
const VALOR = 200
const TETO = 100000

interface Cenario { id: string; pacienteId: string; paciente: string }
type Chave = 'ok' | 'conc' | 'forja' | 'agendada' | 'outra' | 'teto' | 'semParceria' | 'pendAna' | 'pendRecep' | 'futura' | 'fin' | 'apagar'
const C = {} as Record<Chave, Cenario>
let admin: ApiRest
let parceria: ParceriaDT17 | undefined
let outraParceria: ParceriaDT17 | undefined
let tokenAna = ''
let tokenAdmin = ''
let tokenRecep = ''
let tokenFin = ''
let inicializado = false

async function criarSessao(api: ApiRest, adminApi: ApiRest, rotulo: string, profissionalId: string, dados: Record<string, unknown>, hora: string, dias = -1): Promise<Cenario> {
  const pac = await criarPacienteQA(adminApi, `S2-${rotulo}`)
  const r = await api.post('sessoes', {
    paciente_id: pac.id, profissional_id: profissionalId, data_sessao: dataLocal(dias), hora_inicio: hora,
    observacoes: nomeQA(`S2-sessao-${rotulo}`), ...dados,
  }, 'psicologia')
  if (!r.ok || !r.body?.[0]?.id) throw new Error(`Nao foi possivel criar a sessao QA (${rotulo}): ${descrever(r)}`)
  return { id: r.body[0].id, pacienteId: pac.id, paciente: pac.nome }
}

const lancsDoPaciente = async (c: Cenario) => {
  const r = await admin.get(`lancamentos?select=*&paciente=eq.${encodeURIComponent(c.paciente)}`)
  expect(r.status, descrever(r)).toBe(200)
  return r.body as any[]
}
const parcelasDe = async (lancId: string) => {
  const r = await admin.get(`parcelas?select=*&lancamento_id=eq.${lancId}`)
  expect(r.status, descrever(r)).toBe(200)
  return r.body as any[]
}
const sessaoDoBanco = async (id: string) => {
  const r = await admin.get(`sessoes?select=id,status,lancamento_id,valor_sessao&id=eq.${id}`, 'psicologia')
  expect(r.status, descrever(r)).toBe(200)
  return r.body[0]
}

test.beforeAll(async ({}, testInfo) => {
  if (testInfo.project.name !== 'profissional') return
  admin = await clienteAutenticado('admin')
  const ana = await clienteAutenticado('profissional')
  tokenAna = lerSessao('profissional').accessToken
  tokenAdmin = lerSessao('admin').accessToken
  tokenRecep = lerSessao('recepcionista').accessToken
  tokenFin = lerSessao('financeiro').accessToken
  const ps = await listarParcerias(admin)
  parceria = ps.find(p => p.psi1_pct > 0)
  outraParceria = ps.find(p => p.id !== parceria?.id)
  if (!parceria) return
  const fernanda = await outroProfissional(admin, PROFISSIONAL_ANA_ID)
  const base = { status: 'realizada', parceria_id: parceria.id, valor_sessao: VALOR }
  C.ok = await criarSessao(ana, admin, 'ok', PROFISSIONAL_ANA_ID, base, '08:00')
  C.conc = await criarSessao(ana, admin, 'concorrencia', PROFISSIONAL_ANA_ID, base, '09:00')
  C.forja = await criarSessao(ana, admin, 'forja', PROFISSIONAL_ANA_ID, base, '10:00')
  C.agendada = await criarSessao(ana, admin, 'agendada', PROFISSIONAL_ANA_ID, { ...base, status: 'agendada' }, '11:00')
  C.semParceria = await criarSessao(ana, admin, 'sem-parceria', PROFISSIONAL_ANA_ID, { status: 'realizada', valor_sessao: VALOR }, '12:00')
  C.teto = await criarSessao(ana, admin, 'teto', PROFISSIONAL_ANA_ID, { ...base, valor_sessao: TETO + 0.01 }, '13:00')
  C.outra = await criarSessao(admin, admin, 'de-outra-profissional', fernanda.id, base, '14:00')
  C.pendAna = await criarSessao(ana, admin, 'pendente-ana', PROFISSIONAL_ANA_ID, base, '15:00')
  C.pendRecep = await criarSessao(ana, admin, 'pendente-recep', PROFISSIONAL_ANA_ID, base, '16:00')
  C.fin = await criarSessao(ana, admin, 'financeiro-403', PROFISSIONAL_ANA_ID, base, '17:00')
  C.apagar = await criarSessao(ana, admin, 'apagar-lancamento', PROFISSIONAL_ANA_ID, base, '18:00')
  // data futura criada pelo admin por API (a funcao deve recusar com 422)
  C.futura = await criarSessao(admin, admin, 'data-futura', PROFISSIONAL_ANA_ID, base, '19:00', 5)
  inicializado = true
})

test.describe('S2: perfis sem direito de edicao em Psicologia', () => {
  test('financeiro: 403 (sem acl_editar psicologia), mesmo com id valido; nada criado', async ({ perfil }) => {
    test.skip(perfil.id !== 'financeiro', 'so o financeiro')
    const token = lerSessao('financeiro').accessToken
    for (const corpo of [{ sessao_id: UUID_INEXISTENTE }, {}, { sessao_id: 'lixo' }]) {
      const r = await chamarEdge('psicologia-eventos', corpo, token)
      expect(r.status, descreverFn(r)).toBe(403)
    }
  })

  test('recepcionista (gestor, edita Psicologia): id invalido -> 400; sessao inexistente -> 404; nada criado', async ({ perfil, api }) => {
    test.skip(perfil.id !== 'recepcionista', 'so a recepcionista')
    const token = lerSessao('recepcionista').accessToken
    const pode = await api.rpc('acl_editar', { p_modulo: 'psicologia' })
    expect(pode.status, descrever(pode)).toBe(200)
    test.info().annotations.push({ type: 'acl', description: `acl_editar psicologia da recepcionista = ${pode.body}` })
    const invalido = await chamarEdge('psicologia-eventos', { sessao_id: 'lixo' }, token)
    const inexistente = await chamarEdge('psicologia-eventos', { sessao_id: UUID_INEXISTENTE }, token)
    if (pode.body === true) {
      expect(invalido.status, descreverFn(invalido)).toBe(400)
      expect(inexistente.status, descreverFn(inexistente)).toBe(404)
    } else {
      expect(invalido.status, descreverFn(invalido)).toBe(403)
      expect(inexistente.status, descreverFn(inexistente)).toBe(403)
    }
  })
})

test.describe('S2/S3: admin', () => {
  test('admin: id invalido -> 400, evento_id invalido -> 400, sessao inexistente -> 404', async ({ perfil }) => {
    test.skip(perfil.id !== 'admin', 'so o admin')
    const token = lerSessao('admin').accessToken
    const a = await chamarEdge('psicologia-eventos', { sessao_id: 'nao-e-uuid' }, token)
    expect(a.status, descreverFn(a)).toBe(400)
    const b = await chamarEdge('psicologia-eventos', {}, token)
    expect(b.status, descreverFn(b)).toBe(400)
    const c = await chamarEdge('psicologia-eventos', { sessao_id: UUID_INEXISTENTE, evento_id: 'x' }, token)
    expect(c.status, descreverFn(c)).toBe(400)
    const d = await chamarEdge('psicologia-eventos', { sessao_id: UUID_INEXISTENTE }, token)
    expect(d.status, descreverFn(d)).toBe(404)
  })

  test('S3: backup-banco com token de USUARIO (admin) -> 401', async ({ perfil }) => {
    test.skip(perfil.id !== 'admin', 'so o admin')
    const r = await chamarEdge('backup-banco', {}, lerSessao('admin').accessToken)
    expect(r.status, descreverFn(r)).toBe(401)
  })
})

test.describe.serial('S2: cenario com sessoes QA- da Dra. Ana', () => {
  test.beforeEach(({ perfil }) => {
    test.skip(perfil.id !== 'profissional', 'so o profissional')
    test.skip(!parceria, 'o staging nao tem parceria que pague psi1')
    expect(inicializado, 'cenario QA- criado').toBe(true)
  })

  test('ADMIN 1a chamada: 1 lancamento com valor e parceria DO BANCO (corpo forjado ignorado), Ana na cota psi1, parcela unica', async () => {
    const forjado = await chamarEdge('psicologia-eventos', {
      sessao_id: C.forja.id, valor_sessao: 99999, parceria_id: outraParceria?.id ?? UUID_INEXISTENTE,
      paciente_nome: 'QA-nome-forjado', data_sessao: '2020-01-01',
    }, tokenAdmin)
    expect(forjado.status, descreverFn(forjado)).toBe(200)
    expect(forjado.body.lancamento_criado).toBe(true)
    const [l] = await lancsDoPaciente(C.forja)
    expect(l, 'lancamento criado').toBeTruthy()
    expect(Number(l.valor_total), 'valor veio do banco, nao do corpo forjado').toBe(VALOR)
    expect(l.parceria_id, 'parceria veio do banco').toBe(parceria!.id)
    expect(l.paciente, 'nome do paciente veio do banco').toBe(C.forja.paciente)
    expect(String(l.data_atendimento).slice(0, 10)).toBe(dataLocal(-1))
    expect(l.id).toBe(forjado.body.lancamento_id)
    expect((await sessaoDoBanco(C.forja.id)).lancamento_id, 'sessao aponta para o lancamento').toBe(l.id)

    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.ok.id }, tokenAdmin)
    expect(r.status, descreverFn(r)).toBe(200)
    expect(r.body).toMatchObject({ ok: true, lancamento_criado: true })
    const lancs = await lancsDoPaciente(C.ok)
    expect(lancs).toHaveLength(1)
    const lanc = lancs[0]
    expect(lanc.id).toBe(r.body.lancamento_id)
    expect(Number(lanc.valor_total)).toBe(VALOR)
    expect(lanc.parceria_id).toBe(parceria!.id)
    expect(lanc.num_parcelas).toBe(1)
    expect(Number(lanc.psi1_valor)).toBeCloseTo(Math.round(VALOR * parceria!.psi1_pct) / 100, 2)
    expect(Number(lanc.camta_valor)).toBeCloseTo(Math.round(VALOR * parceria!.camta_pct) / 100, 2)
    expect(lanc.psi1_profissional_id, 'cota psi1 atribuida a Ana (profissional da sessao)').toBe(PROFISSIONAL_ANA_ID)
    const parcelas = await parcelasDe(lanc.id)
    expect(parcelas, 'parcela unica').toHaveLength(1)
    expect(Number(parcelas[0].valor_parcela)).toBe(VALOR)
    expect(parcelas[0].parcela_num).toBe(1)
    expect((await sessaoDoBanco(C.ok.id)).lancamento_id).toBe(lanc.id)
  })

  test('2a chamada (admin) e idempotente: mesmo lancamento_id, nenhum lancamento/parcela a mais; Ana na sessao ja vinculada tambem', async () => {
    const antes = await lancsDoPaciente(C.ok)
    expect(antes).toHaveLength(1)
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.ok.id }, tokenAdmin)
    expect(r.status, descreverFn(r)).toBe(200)
    expect(r.body).toMatchObject({ ok: true, lancamento_criado: false, lancamento_id: antes[0].id })
    const ana = await chamarEdge('psicologia-eventos', { sessao_id: C.ok.id }, tokenAna)
    expect(ana.status, descreverFn(ana)).toBe(200)
    expect(ana.body).toMatchObject({ ok: true, lancamento_criado: false })
    const depois = await lancsDoPaciente(C.ok)
    expect(depois, 'lancamentos QA- da sessao').toHaveLength(1)
    expect(await parcelasDe(depois[0].id)).toHaveLength(1)
  })

  test('3 chamadas SIMULTANEAS do admin em sessao nova geram exatamente 1 lancamento', async () => {
    const rs = await Promise.all([1, 2, 3].map(() => chamarEdge('psicologia-eventos', { sessao_id: C.conc.id }, tokenAdmin)))
    for (const r of rs) expect(r.status, descreverFn(r)).toBe(200)
    const criados = rs.filter(r => r.body?.lancamento_criado === true).length
    const lancs = await lancsDoPaciente(C.conc)
    test.info().annotations.push({ type: 'concorrencia', description: `respostas com lancamento_criado=true: ${criados}; lancamentos no banco: ${lancs.length}` })
    expect(lancs, 'um unico lancamento no banco').toHaveLength(1)
    expect(await parcelasDe(lancs[0].id)).toHaveLength(1)
    expect(criados, 'so uma chamada reporta criacao').toBe(1)
    expect((await sessaoDoBanco(C.conc.id)).lancamento_id).toBe(lancs[0].id)
  })

  test('A2: profissional (Ana) na PROPRIA sessao realizada -> 200 pendente_faturamento, sem lancamento e sem vinculo', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.pendAna.id, valor_sessao: 99999, parceria_id: outraParceria?.id ?? UUID_INEXISTENTE }, tokenAna)
    expect(r.status, descreverFn(r)).toBe(200)
    expect(r.body).toMatchObject({ ok: true, lancamento_criado: false, pendente_faturamento: true })
    expect(await lancsDoPaciente(C.pendAna), 'nenhum lancamento').toHaveLength(0)
    expect((await sessaoDoBanco(C.pendAna.id)).lancamento_id, 'sem vinculo').toBeNull()
  })

  test('A2: recepcionista (so Psicologia) -> 200 pendente_faturamento, sem lancamento e sem vinculo', async () => {
    const recep = await clienteAutenticado('recepcionista')
    const pode = await recep.rpc('acl_editar', { p_modulo: 'psicologia' })
    expect(pode.status, descrever(pode)).toBe(200)
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.pendRecep.id }, tokenRecep)
    test.info().annotations.push({ type: 'recepcionista', description: `acl_editar psicologia=${pode.body}; ${descreverFn(r)}` })
    if (pode.body !== true) {
      expect(r.status, descreverFn(r)).toBe(403)
    } else {
      // a recepcionista (gestor) enxerga todas as sessoes pela RLS; se o perfil mudar e nao enxergar, a funcao devolve 404
      expect(r.status, descreverFn(r)).toBe(200)
      expect(r.body).toMatchObject({ ok: true, lancamento_criado: false, pendente_faturamento: true })
    }
    expect(await lancsDoPaciente(C.pendRecep), 'nenhum lancamento').toHaveLength(0)
    expect((await sessaoDoBanco(C.pendRecep.id)).lancamento_id, 'sem vinculo').toBeNull()
  })

  test('financeiro (parcerias sim, psicologia nao) -> 403 em sessao real; so o admin gera lancamento', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.fin.id }, tokenFin)
    expect(r.status, descreverFn(r)).toBe(403)
    expect(await lancsDoPaciente(C.fin)).toHaveLength(0)
    expect((await sessaoDoBanco(C.fin.id)).lancamento_id).toBeNull()
  })

  test('token vazio ("Bearer ") -> 401', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.fin.id }, '')
    expect(r.status, descreverFn(r)).toBe(401)
  })

  test('sessao NAO realizada (agendada) -> 409 e nada criado', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.agendada.id }, tokenAdmin)
    expect(r.status, descreverFn(r)).toBe(409)
    expect(await lancsDoPaciente(C.agendada)).toHaveLength(0)
  })

  test('sessao de OUTRA profissional: Ana -> 404 (RLS), nada criado nem vinculado', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.outra.id }, tokenAna)
    expect(r.status, descreverFn(r)).toBe(404)
    expect(await lancsDoPaciente(C.outra)).toHaveLength(0)
    expect((await sessaoDoBanco(C.outra.id)).lancamento_id).toBeNull()
  })

  test('sessao_id invalido -> 400; evento_id invalido -> 400; inexistente -> 404', async () => {
    const a = await chamarEdge('psicologia-eventos', { sessao_id: 'nao-e-uuid' }, tokenAna)
    expect(a.status, descreverFn(a)).toBe(400)
    const b = await chamarEdge('psicologia-eventos', { sessao_id: C.agendada.id, evento_id: 'lixo' }, tokenAna)
    expect(b.status, descreverFn(b)).toBe(400)
    const c = await chamarEdge('psicologia-eventos', { sessao_id: UUID_INEXISTENTE }, tokenAna)
    expect(c.status, descreverFn(c)).toBe(404)
  })

  test('valor acima do teto (100000) -> 422 (admin e Ana) e nada criado', async () => {
    for (const t of [tokenAdmin, tokenAna]) {
      const r = await chamarEdge('psicologia-eventos', { sessao_id: C.teto.id }, t)
      expect(r.status, descreverFn(r)).toBe(422)
    }
    expect(await lancsDoPaciente(C.teto)).toHaveLength(0)
    expect((await sessaoDoBanco(C.teto.id)).lancamento_id).toBeNull()
  })

  test('sessao com data FUTURA -> 422 e nada criado', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.futura.id }, tokenAdmin)
    expect(r.status, descreverFn(r)).toBe(422)
    expect(await lancsDoPaciente(C.futura)).toHaveLength(0)
    expect((await sessaoDoBanco(C.futura.id)).lancamento_id).toBeNull()
  })

  test('sessao sem parceria -> ok sem lancamento', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.semParceria.id }, tokenAdmin)
    expect(r.status, descreverFn(r)).toBe(200)
    expect(r.body).toMatchObject({ ok: true, lancamento_criado: false })
    expect(r.body.lancamento_id ?? null).toBeNull()
    expect(await lancsDoPaciente(C.semParceria)).toHaveLength(0)
  })

  // A1: trigger da migration 044. O antigo "ACHADO" agora e asserção: so a funcao (service role) grava lancamento_id.
  const bloqueado = (r: any) => {
    expect(r.status, descrever(r)).toBeGreaterThanOrEqual(400)
    expect(r.status, descrever(r)).toBeLessThan(500)
    expect(String(r.body?.code ?? ''), descrever(r)).toBe('42501')
  }

  test('A1: Ana, PATCH lancamento_id=<lancamento QA- existente> na PROPRIA sessao -> 4xx (42501) e a coluna nao muda', async ({ api }) => {
    const lancOk = (await lancsDoPaciente(C.ok))[0]
    const r = await api.patch(`sessoes?id=eq.${C.pendAna.id}`, { lancamento_id: lancOk.id }, 'psicologia')
    bloqueado(r)
    expect((await sessaoDoBanco(C.pendAna.id)).lancamento_id).toBeNull()
  })

  test('A1: Ana, PATCH lancamento_id=null em sessao ja vinculada pelo admin -> 4xx e a coluna nao muda', async ({ api }) => {
    const lancOk = (await lancsDoPaciente(C.ok))[0]
    const r = await api.patch(`sessoes?id=eq.${C.ok.id}`, { lancamento_id: null }, 'psicologia')
    bloqueado(r)
    expect((await sessaoDoBanco(C.ok.id)).lancamento_id).toBe(lancOk.id)
  })

  test('A1: Ana, PATCH em sessao ALHEIA -> nao grava (RLS ou trigger)', async ({ api }) => {
    const lancOk = (await lancsDoPaciente(C.ok))[0]
    const r = await api.patch(`sessoes?id=eq.${C.outra.id}`, { lancamento_id: lancOk.id }, 'psicologia')
    test.info().annotations.push({ type: 'patch-alheia', description: descrever(r) })
    expect((await sessaoDoBanco(C.outra.id)).lancamento_id).toBeNull()
  })

  test('A1: PATCH de outros campos da propria sessao continua permitido (o trigger so olha lancamento_id)', async ({ api }) => {
    const r = await api.patch(`sessoes?id=eq.${C.semParceria.id}`, { observacoes: nomeQA('S2-sessao-sem-parceria-editada') }, 'psicologia')
    expect(r.status, descrever(r)).toBeLessThan(300)
  })

  test('A1: INSERT de sessao com lancamento_id -> 4xx para Ana e para o ADMIN via PostgREST; nada criado', async ({ api }) => {
    const lancOk = (await lancsDoPaciente(C.ok))[0]
    const pac = await criarPacienteQA(admin, 'S2-insert-lancid')
    const corpo = {
      paciente_id: pac.id, profissional_id: PROFISSIONAL_ANA_ID, data_sessao: dataLocal(-2), hora_inicio: '20:00',
      status: 'realizada', observacoes: nomeQA('S2-insert-com-lancamento_id'), lancamento_id: lancOk.id,
    }
    bloqueado(await api.post('sessoes', corpo, 'psicologia'))
    bloqueado(await admin.post('sessoes', corpo, 'psicologia'))
    const q = await admin.get(`sessoes?select=id&paciente_id=eq.${pac.id}`, 'psicologia')
    expect(q.status, descrever(q)).toBe(200)
    expect(q.body, 'nenhuma sessao criada').toHaveLength(0)
  })

  test('A1: ADMIN via PostgREST, PATCH lancamento_id (valor e null) -> 4xx; so a funcao grava', async () => {
    const lancOk = (await lancsDoPaciente(C.ok))[0]
    bloqueado(await admin.patch(`sessoes?id=eq.${C.pendAna.id}`, { lancamento_id: lancOk.id }, 'psicologia'))
    bloqueado(await admin.patch(`sessoes?id=eq.${C.ok.id}`, { lancamento_id: null }, 'psicologia'))
    expect((await sessaoDoBanco(C.pendAna.id)).lancamento_id).toBeNull()
    expect((await sessaoDoBanco(C.ok.id)).lancamento_id).toBe(lancOk.id)
  })

  test('A1: ON DELETE SET NULL continua funcionando: admin apaga o lancamento e a sessao volta a lancamento_id nulo', async () => {
    const r = await chamarEdge('psicologia-eventos', { sessao_id: C.apagar.id }, tokenAdmin)
    expect(r.status, descreverFn(r)).toBe(200)
    expect(r.body.lancamento_criado).toBe(true)
    expect((await sessaoDoBanco(C.apagar.id)).lancamento_id).toBe(r.body.lancamento_id)
    const del = await admin.delete(`lancamentos?id=eq.${r.body.lancamento_id}`)
    expect(del.status, descrever(del)).toBeLessThan(300)
    expect((await sessaoDoBanco(C.apagar.id)).lancamento_id, 'FK ON DELETE SET NULL (executada pelo dono, nao bloqueada pelo trigger)').toBeNull()
  })
})
