import type { Locator, Page } from '@playwright/test'
import { test, expect } from '../../fixtures'
import { descrever } from '../../helpers/api'
import { campo, dataLocal, modalAberto, abrirRota } from '../../helpers/ui'
import {
  ativosDoTipo, cotasPagas, duasPsi1, inserirLancamentoQA, listarParcerias, listarProfissionais,
  nomeLanc, parceriaComMaisCotas, TIPOS,
} from '../../helpers/dt17'
import type { ParceriaDT17, ProfissionalDT17, TipoCota } from '../../helpers/dt17'

// DT17 (admin): formulário/edição por cota, log de troca, trigger de tipo, atribuição em lote.
// Dados criados: lançamentos QA-DT17-* (removidos pela limpeza do projeto 'limpeza').

const ROTULO: Record<TipoCota, string> = { camta: 'Camta', medico: 'Médico', psi1: 'Psi1', psi2: 'Psi2' }
const rotuloSelect = (t: TipoCota) => `Profissional — ${ROTULO[t]}`

test.describe.configure({ mode: 'serial' })

let profs: ProfissionalDT17[]
let parceria: ParceriaDT17
let ana: ProfissionalDT17
let outra: ProfissionalDT17

test.beforeEach(async ({ apiAdmin }) => {
  if (!profs) {
    profs = await listarProfissionais(apiAdmin)
    parceria = parceriaComMaisCotas(await listarParcerias(apiAdmin))
    const d = await duasPsi1(apiAdmin)
    ana = d.ana
    outra = d.outra
  }
})

async function abrirNovo(page: Page, parceriaId: string): Promise<Locator> {
  await abrirRota(page, '/lancamentos')
  await page.getByRole('button', { name: /Novo Lançamento/ }).click()
  const modal = modalAberto(page)
  await modal.locator('h2', { hasText: 'Novo Lançamento' }).waitFor()
  await campo(modal, 'Parceria').selectOption(parceriaId)
  return modal
}

async function preencherBasico(modal: Locator, paciente: string, valor = 1000) {
  await campo(modal, 'Data do Atendimento').fill(dataLocal(-2))
  await campo(modal, 'Nome do Paciente').fill(paciente)
  await campo(modal, 'Valor Total (R$)').fill(String(valor))
}

async function abrirEdicao(page: Page, paciente: string): Promise<Locator> {
  await abrirRota(page, '/lancamentos')
  await page.getByPlaceholder('Buscar paciente...').fill(paciente)
  const linha = page.locator('table tbody tr', { hasText: paciente })
  await linha.first().waitFor()
  await linha.first().getByTitle('Editar').click()
  const modal = modalAberto(page)
  await modal.locator('h2', { hasText: 'Editar Lançamento' }).waitFor()
  return modal
}

test.describe('DT17 admin: formulário Novo Lançamento', () => {
  test('casos 1 e 2: um select por cota paga, só com profissionais do tipo; 1 ativo é pré-selecionado', async ({ page }) => {
    const modal = await abrirNovo(page, parceria.id)
    const bloco = modal.getByTestId('profissionais-por-cota')
    await expect(bloco).toBeVisible()
    const pagas = cotasPagas(parceria)
    expect(pagas.length, 'a parceria usada deve pagar ao menos 1 cota').toBeGreaterThan(0)
    await expect(bloco.locator('select')).toHaveCount(pagas.length)

    for (const t of TIPOS) {
      const sel = campo(bloco, rotuloSelect(t))
      if (!pagas.includes(t)) { await expect(sel, `${t} não é paga: sem select`).toHaveCount(0); continue }
      const esperados = ativosDoTipo(profs, t).map(p => p.nome).sort()
      const opcoes = (await sel.locator('option').allTextContents()).filter(x => x !== 'Selecione...' && x !== 'Nenhum profissional ativo').sort()
      expect(opcoes, `opções de ${t}`).toEqual(esperados)
      if (esperados.length === 1) {
        await expect(sel.locator('option:checked'), `${t} com 1 ativo vem pré-selecionado`).toHaveText(esperados[0])
      } else {
        await expect(sel, `${t} com ${esperados.length} ativos NÃO é pré-selecionado`).toHaveValue('')
      }
    }
  })

  test('caso 3: cota paga com 2+ ativos exige pessoa; mostra a mensagem e nada é gravado', async ({ page, apiAdmin }) => {
    const pagas = cotasPagas(parceria)
    test.skip(!pagas.includes('psi1'), 'a parceria escolhida não paga psi1')
    const paciente = nomeLanc('Form-bloqueio')
    const modal = await abrirNovo(page, parceria.id)
    await preencherBasico(modal, paciente)
    await modal.getByRole('button', { name: 'Salvar Lançamento' }).click()
    const alerta = modal.getByRole('alert')
    await expect(alerta).toContainText('Selecione o profissional de cada cota:')
    await expect(alerta).toContainText('Psi1')
    // tipos com 1 ativo vêm pré-selecionados e não entram na mensagem
    for (const t of pagas.filter(x => ativosDoTipo(profs, x).length === 1)) await expect(alerta).not.toContainText(ROTULO[t])
    await expect(modal.locator('h2', { hasText: 'Novo Lançamento' })).toBeVisible()
    const r = await apiAdmin.get(`lancamentos?select=id&paciente=eq.${encodeURIComponent(paciente)}`)
    expect(r.body, 'nada gravado quando o formulário bloqueia').toHaveLength(0)
  })

  test('casos 3b e 4: com a pessoa escolhida salva e grava as colunas; cota zero não grava pessoa', async ({ page, apiAdmin }) => {
    const pagas = cotasPagas(parceria)
    test.skip(!pagas.includes('psi1'), 'a parceria escolhida não paga psi1')
    const paciente = nomeLanc('Form-grava')
    const modal = await abrirNovo(page, parceria.id)
    await preencherBasico(modal, paciente)
    await campo(modal.getByTestId('profissionais-por-cota'), rotuloSelect('psi1')).selectOption(ana.id)
    await modal.getByRole('button', { name: 'Salvar Lançamento' }).click()
    await modal.locator('h2', { hasText: 'Novo Lançamento' }).waitFor({ state: 'detached', timeout: 20_000 })

    const r = await apiAdmin.get(`lancamentos?select=*&paciente=eq.${encodeURIComponent(paciente)}`)
    expect(r.body, descrever(r)).toHaveLength(1)
    const l = r.body[0]
    expect(l.psi1_profissional_id).toBe(ana.id)
    for (const t of pagas.filter(x => ativosDoTipo(profs, x).length === 1)) {
      expect(l[`${t}_profissional_id`], `${t} pré-selecionado gravado`).toBe(ativosDoTipo(profs, t)[0].id)
    }
    for (const t of TIPOS.filter(x => !pagas.includes(x))) {
      expect(Number(l[`${t}_valor`]), `${t}_valor`).toBe(0)
      expect(l[`${t}_profissional_id`], `cota zero de ${t} não grava pessoa`).toBeNull()
    }
  })

  test('caso 4: parceria que NÃO paga psi1 não mostra o select de psi1 e não grava pessoa psi1', async ({ page, apiAdmin }) => {
    const ps = await listarParcerias(apiAdmin)
    const semPsi1 = ps.find(p => p.psi1_pct === 0 && cotasPagas(p).length > 0)
    test.skip(!semPsi1, 'o staging não tem parceria com psi1 = 0')
    const paciente = nomeLanc('Form-cota-zero')
    const modal = await abrirNovo(page, semPsi1!.id)
    await expect(campo(modal.getByTestId('profissionais-por-cota'), rotuloSelect('psi1'))).toHaveCount(0)
    await preencherBasico(modal, paciente)
    // tipo com 2+ ativos exige escolha (bloqueio esperado): escolhe o primeiro
    for (const t of cotasPagas(semPsi1!)) {
      const ativos = ativosDoTipo(profs, t)
      if (ativos.length > 1) await campo(modal.getByTestId('profissionais-por-cota'), rotuloSelect(t)).selectOption(ativos[0].id)
    }
    await modal.getByRole('button', { name: 'Salvar Lançamento' }).click()
    await modal.locator('h2', { hasText: 'Novo Lançamento' }).waitFor({ state: 'detached', timeout: 20_000 })
    const r = await apiAdmin.get(`lancamentos?select=psi1_valor,psi1_profissional_id&paciente=eq.${encodeURIComponent(paciente)}`)
    expect(r.body).toHaveLength(1)
    expect(Number(r.body[0].psi1_valor)).toBe(0)
    expect(r.body[0].psi1_profissional_id).toBeNull()
  })
})

test.describe('DT17 admin: edição', () => {
  test('caso 5: a edição carrega a pessoa gravada; salvar sem mexer mantém a pessoa escolhida e não gera log dela', async ({ page, apiAdmin }) => {
    test.skip(!cotasPagas(parceria).includes('psi1'), 'a parceria escolhida não paga psi1')
    const paciente = nomeLanc('Edicao-mantem')
    const l = await inserirLancamentoQA(apiAdmin, {
      paciente, parceria_id: parceria.id, valores: { psi1: 100 }, pessoas: { psi1: outra.id },
    })
    const modal = await abrirEdicao(page, paciente)
    await expect(campo(modal.getByTestId('profissionais-por-cota'), rotuloSelect('psi1'))).toHaveValue(outra.id)
    await modal.getByRole('button', { name: 'Salvar Alterações' }).click()
    await modal.locator('h2', { hasText: 'Editar Lançamento' }).waitFor({ state: 'detached', timeout: 20_000 })

    const r = await apiAdmin.get(`lancamentos?select=psi1_profissional_id&id=eq.${l.id}`)
    expect(r.body[0].psi1_profissional_id, 'pessoa mantida').toBe(outra.id)
    // Cotas sem pessoa que só têm 1 profissional ativo são pré-selecionadas ao editar (atribuição real, auditada pelo
    // trigger da 042); o que se prova aqui é que a pessoa JÁ escolhida em Psi1 não muda e não gera log.
    const log = await apiAdmin.get(`lancamentos_edicoes_log?select=campo&lancamento_id=eq.${l.id}&campo=eq.Profissional Psi1`)
    expect(log.body, 'Psi1 mantida = sem log de Profissional Psi1').toHaveLength(0)
  })

  test('caso 5b: trocar a pessoa pela tela grava a nova pessoa e o log "Profissional Psi1" com os nomes', async ({ page, apiAdmin }) => {
    test.skip(!cotasPagas(parceria).includes('psi1'), 'a parceria escolhida não paga psi1')
    const paciente = nomeLanc('Edicao-troca')
    const l = await inserirLancamentoQA(apiAdmin, {
      paciente, parceria_id: parceria.id, valores: { psi1: 100 }, pessoas: { psi1: outra.id },
    })
    const modal = await abrirEdicao(page, paciente)
    await campo(modal.getByTestId('profissionais-por-cota'), rotuloSelect('psi1')).selectOption(ana.id)
    await modal.getByRole('button', { name: 'Salvar Alterações' }).click()
    await modal.locator('h2', { hasText: 'Editar Lançamento' }).waitFor({ state: 'detached', timeout: 20_000 })

    const r = await apiAdmin.get(`lancamentos?select=psi1_profissional_id&id=eq.${l.id}`)
    expect(r.body[0].psi1_profissional_id).toBe(ana.id)
    const log = await apiAdmin.get(`lancamentos_edicoes_log?select=campo,valor_anterior,valor_novo,alterado_por&lancamento_id=eq.${l.id}&campo=eq.Profissional Psi1`)
    expect(log.body, descrever(log)).toHaveLength(1)
    expect(log.body[0].valor_anterior).toBe(outra.nome)
    expect(log.body[0].valor_novo).toBe(ana.nome)
    expect(log.body[0].alterado_por, 'auditoria registra quem trocou').toBeTruthy()
  })
})

test.describe('DT17 admin: API (trigger, log, lote)', () => {
  test('troca de pessoa por UPDATE gera 1 linha de log por troca real; repetir o mesmo valor não gera', async ({ apiAdmin }) => {
    const l = await inserirLancamentoQA(apiAdmin, {
      paciente: nomeLanc('API-log'), parceria_id: parceria.id, valores: { psi1: 50 },
    })
    const p1 = await apiAdmin.patch(`lancamentos?id=eq.${l.id}`, { psi1_profissional_id: ana.id })
    expect(p1.status, descrever(p1)).toBe(200)
    const p2 = await apiAdmin.patch(`lancamentos?id=eq.${l.id}`, { psi1_profissional_id: ana.id })
    expect(p2.status, descrever(p2)).toBe(200)
    const p3 = await apiAdmin.patch(`lancamentos?id=eq.${l.id}`, { psi1_profissional_id: outra.id })
    expect(p3.status, descrever(p3)).toBe(200)
    const log = await apiAdmin.get(`lancamentos_edicoes_log?select=valor_anterior,valor_novo,alterado_em&lancamento_id=eq.${l.id}&campo=eq.Profissional Psi1&order=alterado_em`)
    expect(log.body, descrever(log)).toHaveLength(2)
    expect([log.body[0].valor_anterior, log.body[0].valor_novo]).toEqual(['', ana.nome])
    expect([log.body[1].valor_anterior, log.body[1].valor_novo]).toEqual([ana.nome, outra.nome])
  })

  test('caso 7 (servidor): pessoa de tipo diferente na coluna é recusada (23514, 4xx) e nada muda', async ({ apiAdmin }) => {
    const l = await inserirLancamentoQA(apiAdmin, {
      paciente: nomeLanc('API-tipo-errado'), parceria_id: parceria.id, valores: { camta: 50 },
    })
    const r = await apiAdmin.patch(`lancamentos?id=eq.${l.id}`, { camta_profissional_id: ana.id })
    expect(r.status, descrever(r)).toBeGreaterThanOrEqual(400)
    expect(r.status).toBeLessThan(500)
    expect(JSON.stringify(r.body)).toMatch(/23514|não é do tipo/)
    const depois = await apiAdmin.get(`lancamentos?select=camta_profissional_id&id=eq.${l.id}`)
    expect(depois.body[0].camta_profissional_id).toBeNull()

    const ins = await apiAdmin.post('lancamentos', {
      data_atendimento: dataLocal(-1), paciente: nomeLanc('API-insert-tipo-errado'), parceria_id: parceria.id,
      forma_pagamento: 'avista', num_parcelas: 1, valor_total: 10, camta_valor: 10, medico_valor: 0, psi1_valor: 0, psi2_valor: 0,
      camta_profissional_id: ana.id, status: 'pendente',
    })
    expect(ins.status, 'INSERT com pessoa de tipo errado: ' + descrever(ins)).toBeGreaterThanOrEqual(400)
    expect(ins.status).toBeLessThan(500)
  })

  test('pessoa inexistente na coluna é recusada (4xx)', async ({ apiAdmin }) => {
    const l = await inserirLancamentoQA(apiAdmin, { paciente: nomeLanc('API-pessoa-inexistente'), parceria_id: parceria.id, valores: { psi1: 10 } })
    const r = await apiAdmin.patch(`lancamentos?id=eq.${l.id}`, { psi1_profissional_id: '00000000-0000-4000-8000-000000000000' })
    expect(r.status, descrever(r)).toBeGreaterThanOrEqual(400)
    expect(r.status).toBeLessThan(500)
  })

  test('caso 7 (lote): 2 lançamentos QA- sem pessoa em psi1 são atribuídos por UPDATE filtrado, conferidos e auditados', async ({ apiAdmin }) => {
    const a = await inserirLancamentoQA(apiAdmin, { paciente: nomeLanc('Lote-A'), parceria_id: parceria.id, valores: { psi1: 30 } })
    const b = await inserirLancamentoQA(apiAdmin, { paciente: nomeLanc('Lote-B'), parceria_id: parceria.id, valores: { psi1: 40 } })
    const ids = `in.(${a.id},${b.id})`
    // mesmo filtro do lote do front (valor > 0, pessoa nula, não cancelado), restrito aos 2 ids QA- (nunca o legado)
    const r = await apiAdmin.patch(`lancamentos?id=${ids}&psi1_valor=gt.0&psi1_profissional_id=is.null&status=neq.cancelado`, { psi1_profissional_id: ana.id })
    expect(r.status, descrever(r)).toBe(200)
    expect(r.body).toHaveLength(2)
    const conf = await apiAdmin.get(`lancamentos?select=id,psi1_profissional_id&id=${ids}`)
    expect(conf.body.every((x: { psi1_profissional_id: string }) => x.psi1_profissional_id === ana.id)).toBe(true)
    const deNovo = await apiAdmin.patch(`lancamentos?id=${ids}&psi1_valor=gt.0&psi1_profissional_id=is.null`, { psi1_profissional_id: outra.id })
    expect(deNovo.body, 'idempotente: nada mais sem pessoa').toHaveLength(0)
    const log = await apiAdmin.get(`lancamentos_edicoes_log?select=id&lancamento_id=${ids}&campo=eq.Profissional Psi1`)
    expect(log.body, 'a atribuição em lote também é auditada').toHaveLength(2)
  })
})

test.describe('DT17 admin: modal "Atribuir profissionais" (sem executar o lote)', () => {
  test('caso 7 (tela): abre o modal, mostra a contagem de cotas sem pessoa e o select só com ativos do tipo', async ({ page, apiAdmin }) => {
    // Garante ao menos 1 cota psi1 sem pessoa (lançamento QA-). O botão "Atribuir a todas" NÃO é clicado:
    // ele atribuiria TODO o legado sem pessoa do staging, alterando dados que não são da suíte.
    await inserirLancamentoQA(apiAdmin, { paciente: nomeLanc('Modal-lote'), parceria_id: parceria.id, valores: { psi1: 10 } })
    await abrirRota(page, '/lancamentos')
    await page.getByRole('button', { name: 'Atribuir profissionais' }).click()
    const modal = modalAberto(page)
    await modal.locator('h2', { hasText: 'Atribuir profissionais aos lançamentos' }).waitFor()
    const bloco = modal.locator('div.rounded-xl', { hasText: 'Psi1:' }).first()
    await expect(bloco).toContainText(/\d+ cota\(s\) sem pessoa/)
    const n = Number((await bloco.textContent())!.match(/(\d+) cota\(s\) sem pessoa/)![1])
    expect(n, 'pelo menos o lançamento QA- recém-criado').toBeGreaterThanOrEqual(1)
    const esperados = ativosDoTipo(profs, 'psi1').map(p => p.nome).sort()
    const opcoes = (await bloco.locator('option').allTextContents()).filter(x => x !== 'Selecione...').sort()
    expect(opcoes).toEqual(esperados)
    await expect(modal.getByRole('button', { name: 'Atribuir a todas' }).first(), 'desabilitado até escolher pessoa').toBeDisabled()
    await modal.getByRole('button', { name: 'Fechar' }).click()
  })
})
