import * as fs from 'node:fs'
import type { Download, Locator, Page } from '@playwright/test'
import { test, expect } from '../../fixtures'
import { abrirRota } from '../../helpers/ui'

// Roda DEPOIS do fluxo financeiro (arquivo 05): o repasse criado hoje habilita o Excel/PDF mensal de Repasses.

async function cabecalho(dl: Download, bytes: number): Promise<string> {
  const caminho = await dl.path()
  const fd = fs.openSync(caminho, 'r')
  const buf = Buffer.alloc(bytes)
  fs.readSync(fd, buf, 0, bytes, 0)
  fs.closeSync(fd)
  return buf.toString('latin1')
}

function cartao(page: Page, titulo: string): Locator {
  return page.locator('h2', { hasText: titulo }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
}

async function baixar(page: Page, botao: Locator): Promise<Download> {
  await expect(botao, 'botão deve estar habilitado (há dados para o relatório)').toBeEnabled()
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), botao.click()])
  return dl
}

test.describe('Admin: Relatórios', () => {
  test.beforeEach(async ({ page }) => { await abrirRota(page, '/relatorios') })

  test('PDF de Lançamentos é gerado e baixado', async ({ page, coletor }) => {
    const dl = await baixar(page, cartao(page, 'Relatório de Lançamentos').getByRole('button', { name: /Gerar PDF/ }))
    expect(dl.suggestedFilename()).toMatch(/\.pdf$/i)
    expect(await cabecalho(dl, 4)).toBe('%PDF')
    expect(coletor.resumoApi()).toEqual([])
  })

  test('Excel de Repasses (mensal) é gerado e baixado', async ({ page }) => {
    const dl = await baixar(page, cartao(page, 'Relatório Mensal de Repasses').getByRole('button', { name: /Exportar Excel/ }))
    expect(dl.suggestedFilename()).toMatch(/\.xlsx$/i)
    expect(await cabecalho(dl, 2)).toBe('PK') // xlsx = zip
  })

  test('PDF mensal de Repasses', async ({ page }) => {
    const dl = await baixar(page, cartao(page, 'Relatório Mensal de Repasses').getByRole('button', { name: /Gerar PDF/ }))
    expect(await cabecalho(dl, 4)).toBe('%PDF')
  })

  test('PDF de Parcelas', async ({ page }) => {
    const dl = await baixar(page, cartao(page, 'Relatório de Parcelas').getByRole('button', { name: /Gerar PDF/ }))
    expect(await cabecalho(dl, 4)).toBe('%PDF')
  })

  test('PDF de Rateio Mensal', async ({ page }) => {
    const dl = await baixar(page, cartao(page, 'Relatório de Rateio Mensal').getByRole('button', { name: /Gerar PDF/ }))
    expect(await cabecalho(dl, 4)).toBe('%PDF')
  })

  // Habilitado só se houver parcelas vencidas pendentes (o fluxo 04 deixa parcelas renegociadas, não pendentes).
  test('PDF de Inadimplência (se houver parcelas vencidas)', async ({ page }) => {
    const botao = cartao(page, 'Relatório de Inadimplência').getByRole('button', { name: /Gerar PDF/ })
    test.skip(await botao.isDisabled(), 'sem parcelas vencidas pendentes no staging: botão desabilitado por desenho')
    const dl = await baixar(page, botao)
    expect(await cabecalho(dl, 4)).toBe('%PDF')
  })
})
