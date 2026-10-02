import { test, expect } from '../../fixtures'
import { clienteAutenticado, descrever, semDados } from '../../helpers/api'
import type { ApiRest } from '../../helpers/api'
import { dataLocal } from '../../helpers/ui'
import { desdeDozeMeses, duasPsi1, inserirLancamentoQA, listarParcerias, nomeLanc } from '../../helpers/dt17'
import type { ProfissionalDT17 } from '../../helpers/dt17'

// DT17 (roda nos 4 perfis): extrato_profissional / extrato_mensal por pessoa, pela API REST (rpc).
// Dataset QA- criado pelo admin em cada projeto (4 lançamentos psi1, valores distintos):
//   A = 100 da Ana | F = 200 da outra psi1 (Fernanda) | S = 300 SEM pessoa | C = 50 da Ana CANCELADO
// Esperado por perfil:
//   admin/financeiro: por tipo veem A,F,S,C; por pessoa veem só as da pessoa (p_profissional_id prevalece sobre p_tipo)
//   profissional (Ana): só A e C, mesmo forjando p_tipo/p_profissional_id; nunca F nem S
//   recepcionista: 0 linhas sempre (sem profissional_id e sem acl_ver parcerias)

interface Linha { id: string; paciente: string; valor_total: number; valor_profissional: number; status: string; data_atendimento: string }
type K = 'A' | 'F' | 'S' | 'C'

let admin: ApiRest
let ana: ProfissionalDT17
let outra: ProfissionalDT17
let nomes: Record<K, string>
let ids: Record<K, string>
const V = { A: 100, F: 200, S: 300, C: 50 }

test.beforeAll(async ({}, testInfo) => {
  admin = await clienteAutenticado('admin')
  const d = await duasPsi1(admin)
  ana = d.ana
  outra = d.outra
  const parceria = (await listarParcerias(admin))[0]
  const rot = `API-${testInfo.project.name}`
  nomes = { A: nomeLanc(rot, 'A'), F: nomeLanc(rot, 'F'), S: nomeLanc(rot, 'S'), C: nomeLanc(rot, 'C') }
  const mk = (n: string, valor: number, pessoa: string | null, status: 'pendente' | 'cancelado' = 'pendente') =>
    inserirLancamentoQA(admin, { paciente: n, parceria_id: parceria.id, valores: { psi1: valor }, pessoas: { psi1: pessoa }, data: dataLocal(-1), status })
  const a = await mk(nomes.A, V.A, ana.id)
  const f = await mk(nomes.F, V.F, outra.id)
  const s = await mk(nomes.S, V.S, null)
  const c = await mk(nomes.C, V.C, ana.id, 'cancelado')
  ids = { A: a.id, F: f.id, S: s.id, C: c.id }
})

/** Só as linhas do dataset QA- deste projeto (o legado do staging não entra na comparação). */
const meus = (linhas: Linha[]) => linhas.filter(l => Object.values(ids).includes(l.id))
const chaves = (linhas: Linha[]) => meus(linhas).map(l => l.id).sort()
const esperados = (...k: K[]) => k.map(x => ids[x]).sort()

async function extrato(api: ApiRest, args: Record<string, unknown>) {
  const r = await api.rpc<Linha[]>('extrato_profissional', args)
  expect(r.status, descrever(r)).toBe(200)
  return r.body
}

test.describe('DT17: extrato_profissional por perfil', () => {
  test('admin/financeiro: por tipo veem as 4 linhas QA-; por pessoa só as da pessoa (casos 9, 10, 12)', async ({ api, perfil }) => {
    test.skip(!['admin', 'financeiro'].includes(perfil.id), 'só admin/financeiro')
    const tipo = await extrato(api, { p_tipo: 'psi1', p_inicio: null, p_fim: null })
    expect(chaves(tipo)).toEqual(esperados('A', 'F', 'S', 'C'))
    const valores = Object.fromEntries(meus(tipo).map(l => [l.id, l.valor_profissional]))
    expect(Number(valores[ids.A])).toBe(V.A)
    expect(Number(valores[ids.S])).toBe(V.S)
    // por pessoa: p_profissional_id prevalece sobre p_tipo (mesmo com p_tipo de outro tipo ou nulo)
    for (const pt of ['psi1', 'medico', null]) {
      const r = await extrato(api, { p_tipo: pt, p_inicio: null, p_fim: null, p_profissional_id: ana.id })
      expect(chaves(r), `Ana com p_tipo=${pt}`).toEqual(esperados('A', 'C'))
    }
    const daOutra = await extrato(api, { p_tipo: 'psi1', p_inicio: null, p_fim: null, p_profissional_id: outra.id })
    expect(chaves(daOutra)).toEqual(esperados('F'))
    expect(Number(meus(daOutra)[0].valor_profissional)).toBe(V.F)
    // filtro de data continua valendo por pessoa
    const futuro = await extrato(api, { p_tipo: 'psi1', p_inicio: dataLocal(5), p_fim: null, p_profissional_id: ana.id })
    expect(chaves(futuro)).toEqual([])
    // tipo inválido sem pessoa: nada
    const invalido = await api.rpc('extrato_profissional', { p_tipo: 'xyz', p_inicio: null, p_fim: null })
    expect(invalido.status).toBe(200)
    expect(invalido.body).toEqual([])
  })

  test('profissional (Ana): só as próprias (A e C); nunca a da outra psi1 nem a sem pessoa; forjar parâmetros não muda (casos 8 a 11)', async ({ api, perfil }) => {
    test.skip(perfil.id !== 'profissional', 'só o profissional')
    const base = await extrato(api, { p_tipo: 'psi1', p_inicio: null, p_fim: null })
    expect(chaves(base)).toEqual(esperados('A', 'C'))
    const a = meus(base).find(l => l.id === ids.A)!
    expect(a.paciente, 'nome completo do paciente (decisão do DT17)').toBe(nomes.A)
    expect(Number(a.valor_total)).toBe(V.A)
    expect(Number(a.valor_profissional)).toBe(V.A)
    // forjados: p_tipo de outro tipo, pessoa da colega, os dois, tipo nulo
    const forjados: Record<string, unknown>[] = [
      { p_tipo: 'medico', p_inicio: null, p_fim: null },
      { p_tipo: 'psi2', p_inicio: null, p_fim: null, p_profissional_id: outra.id },
      { p_tipo: 'psi1', p_inicio: null, p_fim: null, p_profissional_id: outra.id },
      { p_tipo: null, p_inicio: null, p_fim: null, p_profissional_id: outra.id },
    ]
    for (const [i, args] of forjados.entries()) {
      const r = await extrato(api, args)
      expect(chaves(r), `forjado #${i + 1}`).toEqual(esperados('A', 'C'))
    }
    expect(base.every(l => Number(l.valor_profissional) > 0)).toBe(true)
    expect(base.find(l => l.id === ids.F || l.id === ids.S)).toBeUndefined()
    // sem acesso direto à tabela (continua só por função)
    const direto = await api.get(`lancamentos?select=id&id=in.(${ids.A},${ids.F},${ids.S})`)
    expect(semDados(direto), descrever(direto)).toBe(true)
  })

  test('recepcionista: 0 linhas nas duas funções, inclusive com p_tipo e p_profissional_id forjados (caso 11)', async ({ api, perfil }) => {
    test.skip(perfil.id !== 'recepcionista', 'só o recepcionista')
    for (const args of [
      { p_tipo: 'psi1', p_inicio: null, p_fim: null },
      { p_tipo: 'psi1', p_inicio: null, p_fim: null, p_profissional_id: ana.id },
      { p_tipo: null, p_inicio: null, p_fim: null, p_profissional_id: outra.id },
    ]) {
      const r = await api.rpc('extrato_profissional', args)
      expect(semDados(r), descrever(r)).toBe(true)
    }
    for (const args of [
      { p_tipo: 'psi1', p_desde: desdeDozeMeses() },
      { p_tipo: 'psi1', p_desde: desdeDozeMeses(), p_profissional_id: ana.id },
    ]) {
      const r = await api.rpc('extrato_mensal', args)
      expect(semDados(r), descrever(r)).toBe(true)
    }
  })
})

type Mensal = { iso_mes: string; valor: number; atendimentos: number }

test.describe('DT17: extrato_mensal consistente com a lista (caso 13)', () => {
  test('mensal por pessoa soma só as cotas da pessoa, exclui cancelado e bate com a lista', async ({ api, perfil }) => {
    test.skip(perfil.id === 'recepcionista', 'recepcionista recebe 0 linhas (teste próprio)')
    const desde = desdeDozeMeses()
    const ehGestor = perfil.id === 'admin' || perfil.id === 'financeiro'
    // admin/financeiro escolhem a Ana; a própria Ana usa a regra do banco
    const argsLista = ehGestor ? { p_tipo: 'psi1', p_inicio: desde, p_fim: null, p_profissional_id: ana.id } : { p_tipo: 'psi1', p_inicio: desde, p_fim: null }
    const argsMensal = ehGestor ? { p_tipo: 'psi1', p_desde: desde, p_profissional_id: ana.id } : { p_tipo: 'psi1', p_desde: desde }
    const lista = await extrato(api, argsLista)
    const m = await api.rpc<Mensal[]>('extrato_mensal', argsMensal)
    expect(m.status, descrever(m)).toBe(200)

    const esperado = new Map<string, { valor: number; n: number }>()
    for (const l of lista.filter(x => x.status !== 'cancelado' && Number(x.valor_profissional) > 0)) {
      const mes = l.data_atendimento.slice(0, 7)
      const e = esperado.get(mes) ?? { valor: 0, n: 0 }
      esperado.set(mes, { valor: e.valor + Number(l.valor_profissional), n: e.n + 1 })
    }
    const obtido = new Map(m.body.map(x => [x.iso_mes, { valor: Number(x.valor), n: Number(x.atendimentos) }]))
    expect([...obtido.keys()].sort()).toEqual([...esperado.keys()].sort())
    for (const [mes, e] of esperado) {
      expect(obtido.get(mes)!.valor, `valor de ${mes}`).toBeCloseTo(e.valor, 2)
      expect(obtido.get(mes)!.n, `atendimentos de ${mes}`).toBe(e.n)
    }
    // o cancelado (50) está na lista com status, mas fora do mensal
    expect(lista.some(x => x.id === ids.C && x.status === 'cancelado'), 'o cancelado aparece na lista com status').toBe(true)
    const mesA = dataLocal(-1).slice(0, 7)
    expect(obtido.get(mesA)!.valor).toBeGreaterThanOrEqual(V.A)
  })

  test('admin/financeiro: mensal por pessoa isola cada pessoa; por tipo inclui todas, também a sem pessoa', async ({ api, perfil }) => {
    test.skip(!['admin', 'financeiro'].includes(perfil.id), 'só admin/financeiro')
    const desde = desdeDozeMeses()
    const mes = dataLocal(-1).slice(0, 7)
    const valorDoMes = async (args: Record<string, unknown>) => {
      const r = await api.rpc<Mensal[]>('extrato_mensal', args)
      expect(r.status, descrever(r)).toBe(200)
      return Number(r.body.find(x => x.iso_mes === mes)?.valor ?? 0)
    }
    const vAna = await valorDoMes({ p_tipo: 'psi1', p_desde: desde, p_profissional_id: ana.id })
    const vOutra = await valorDoMes({ p_tipo: 'psi1', p_desde: desde, p_profissional_id: outra.id })
    const vTipo = await valorDoMes({ p_tipo: 'psi1', p_desde: desde })
    expect(vAna).toBeGreaterThanOrEqual(V.A)
    expect(vOutra).toBeGreaterThanOrEqual(V.F)
    expect(vTipo, 'por tipo >= A + F + S').toBeGreaterThanOrEqual(V.A + V.F + V.S)
    expect(vTipo, 'por tipo > soma das duas pessoas (a cota sem pessoa só entra no tipo)').toBeGreaterThan(vAna + vOutra - 1e-9)
  })
})
