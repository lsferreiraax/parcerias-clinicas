import * as fs from 'node:fs'
import type { BrowserContext } from '@playwright/test'
import { test, expect } from '../../fixtures'
import { psicologiaExposta, versaoEsperada } from '../../config'
import { clienteAutenticado } from '../../helpers/api'
import { ColetorErros } from '../../helpers/coletor'
import { ADMINISTRACAO, FINANCEIRAS, MENU_ADMIN, PRINCIPAIS_MOBILE, PSICOLOGIA } from '../../helpers/rotas'
import { lerSessao } from '../../helpers/sessao'
import { GuardaEscrita, instalarGuarda } from '../../helpers/somente-leitura'
import { abrirRota, hrefsDoMenu, rolagemHorizontal, uuidsNoMain } from '../../helpers/ui'

/**
 * SMOKE DO ADMIN EM PRODUÇÃO: somente leitura. O guarda aborta qualquer escrita fora da allowlist.
 * Asserções só com rotas, contagens e status (nunca texto de página, e-mail, nome ou valor).
 */

interface ResultadoRota { rota: string; destino: string; temTitulo: boolean; semAcessoRestrito: boolean; uuids: number; apiErros: string[] }

const rotasVarridas = (): string[] => [...FINANCEIRAS, ...ADMINISTRACAO, ...(psicologiaExposta() ? PSICOLOGIA : [])]

let varredura: ResultadoRota[] = []
let guardaVarredura: GuardaEscrita
let contextoVarredura: BrowserContext

test.describe('Produção: smoke do admin', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(240_000)
    contextoVarredura = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: testInfo.project.use.storageState as string,
      serviceWorkers: 'block',
      locale: 'pt-BR',
      viewport: { width: 1366, height: 800 },
    })
    guardaVarredura = await instalarGuarda(contextoVarredura)
    const page = await contextoVarredura.newPage()
    const coletor = new ColetorErros(page)
    await page.goto('/')
    for (const rota of rotasVarridas()) {
      coletor.limpar()
      const r: ResultadoRota = { rota, destino: '', temTitulo: false, semAcessoRestrito: true, uuids: 0, apiErros: [] }
      try {
        r.destino = await abrirRota(page, rota)
        r.temTitulo = (await page.locator('main h1').count()) > 0
        // só booleano: o texto do título não é guardado
        r.semAcessoRestrito = !(await page.locator('main h1', { hasText: /Acesso Restrito/i }).count())
        r.uuids = await uuidsNoMain(page)
      } catch {
        r.destino = 'erro-na-varredura'
      }
      r.apiErros = [...coletor.apiErros]
      varredura.push(r)
    }
  })

  test.afterAll(async () => { await contextoVarredura?.close() })

  test('sessão: perfil admin e menu de administração visível', async ({ page }) => {
    await page.goto('/')
    const s = lerSessao('admin')
    const api = await clienteAutenticado('admin')
    const r = await api.get(`user_profiles?select=role&id=eq.${s.userId}`)
    expect(r.status, 'GET do próprio perfil (status)').toBe(200)
    expect(Array.isArray(r.body) && r.body.length === 1, 'linhas do próprio perfil').toBe(true)
    expect(r.body[0]?.role, 'role do usuário logado').toBe('admin')
  })

  test('sidebar mostra a versão esperada', async ({ page }) => {
    const esperada = versaoEsperada()
    test.skip(!esperada, 'versão esperada não definida')
    await page.goto('/')
    await abrirRota(page, '/')
    const texto = await page.locator('aside').first().innerText()
    const achada = texto.match(/v(\d+\.\d+\.\d+)/)?.[1] ?? '(nenhuma)'
    expect(achada, 'versão exibida na sidebar').toBe(esperada)
  })

  test('telas financeiras e de administração abrem (sem redirecionar nem "Acesso Restrito")', async () => {
    for (const rota of [...FINANCEIRAS, ...ADMINISTRACAO]) {
      const r = varredura.find(v => v.rota === rota)!
      expect.soft(r.destino, `rota ${rota} deveria abrir`).toBe(rota)
      expect.soft(r.temTitulo, `rota ${rota} sem título`).toBe(true)
      expect.soft(r.semAcessoRestrito, `rota ${rota} caiu em Acesso Restrito`).toBe(true)
    }
  })

  test('telas de Psicologia/Salas abrem (só com PROD_PSICOLOGIA_EXPOSTA=sim)', async () => {
    test.skip(!psicologiaExposta(), 'schema psicologia ainda não exposto em produção (defina PROD_PSICOLOGIA_EXPOSTA=sim após a promoção)')
    for (const rota of PSICOLOGIA) {
      const r = varredura.find(v => v.rota === rota)!
      expect.soft(r.destino, `rota ${rota} deveria abrir`).toBe(rota)
      expect.soft(r.temTitulo && r.semAcessoRestrito, `rota ${rota} sem título ou em Acesso Restrito`).toBe(true)
    }
  })

  test('0 UUIDs no texto visível das telas (contagem em memória)', async () => {
    for (const r of varredura) expect.soft(r.uuids, `UUIDs distintos visíveis em ${r.rota}`).toBe(0)
  })

  test('0 respostas de API >= 400 nas telas', async () => {
    for (const r of varredura) expect.soft(r.apiErros, `respostas de API >= 400 em ${r.rota}`).toEqual([])
  })

  test('menu == rotas permitidas do admin', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/')
    const menu = await hrefsDoMenu(page)
    expect(menu.length, 'itens no menu').toBe(MENU_ADMIN.length)
    expect([...menu].sort()).toEqual([...MENU_ADMIN].sort())
    for (const rota of rotasVarridas()) expect.soft(menu, `rota varrida ${rota} presente no menu`).toContain(rota)
  })

  test('Dashboard: os KPIs principais renderizam números', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/')
    const rotulos = ['Total Atendimentos', 'Receita Total', 'Receita Recebida', 'Parcelas Vencidas']
    // Retorna só contagens: quantos rótulos foram achados e quantos trazem dígito no valor (o texto não sai do navegador).
    const r = await page.evaluate(ls => {
      let achados = 0, comNumero = 0
      document.querySelectorAll('main p').forEach(p => {
        const t = (p.textContent ?? '').trim().toLowerCase()
        if (ls.some(l => l.toLowerCase() === t)) {
          achados++
          if (/\d/.test(p.nextElementSibling?.textContent ?? '')) comNumero++
        }
      })
      return { achados, comNumero }
    }, rotulos)
    expect(r.achados, 'KPIs encontrados').toBe(rotulos.length)
    expect(r.comNumero, 'KPIs com valor numérico').toBe(rotulos.length)
  })

  test('Usuários: coluna "Perfil de Acesso" preenchida para todos', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/usuarios')
    await expect(page.getByRole('columnheader', { name: 'Perfil de Acesso' })).toBeVisible()
    const r = await page.evaluate(() => {
      const ths = Array.from(document.querySelectorAll('thead th'))
      const idx = ths.findIndex(th => (th.textContent ?? '').trim() === 'Perfil de Acesso')
      const linhas = Array.from(document.querySelectorAll('tbody tr'))
      const vazias = linhas.filter(tr => {
        const v = (tr.querySelectorAll('td')[idx]?.textContent ?? '').trim()
        return v === '' || v === '—'
      }).length
      return { idx, linhas: linhas.length, vazias }
    })
    expect(r.idx, 'posição da coluna Perfil de Acesso').toBeGreaterThanOrEqual(0)
    expect(r.linhas, 'usuários listados').toBeGreaterThan(0)
    expect(r.vazias, `usuários sem Perfil de Acesso (de ${r.linhas})`).toBe(0)
  })

  test('sem rolagem horizontal em 375px nas telas principais', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    for (const rota of PRINCIPAIS_MOBILE) {
      const destino = await abrirRota(page, rota)
      expect.soft(destino, `rota ${rota} em 375px`).toBe(rota)
      const s = await rolagemHorizontal(page)
      expect.soft(s.pagina, `rolagem horizontal da página em ${rota}`).toBeLessThanOrEqual(1)
      expect.soft(s.conteudo, `rolagem horizontal do conteúdo em ${rota}; ofensores: ${s.ofensores.join(' | ')}`).toBeLessThanOrEqual(1)
    }
  })

  test('PDF de Relatório de Lançamentos é gerado no cliente e baixado (%PDF, tamanho > 0)', async ({ page, guarda }) => {
    await page.goto('/')
    await abrirRota(page, '/relatorios')
    const cartao = page.locator('h2', { hasText: 'Relatório de Lançamentos' }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
    const botao = cartao.getByRole('button', { name: /Gerar PDF/ })
    await expect(botao).toBeVisible()
    test.skip(await botao.isDisabled(), 'sem lançamentos em produção: botão desabilitado por desenho')
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), botao.click()])
    expect(dl.suggestedFilename(), 'extensão do arquivo').toMatch(/\.pdf$/i)
    const caminho = await dl.path()
    const tamanho = fs.statSync(caminho).size
    const fd = fs.openSync(caminho, 'r'); const buf = Buffer.alloc(4); fs.readSync(fd, buf, 0, 4, 0); fs.closeSync(fd)
    expect(buf.toString('latin1'), 'assinatura do arquivo').toBe('%PDF')
    expect(tamanho, 'tamanho do PDF (bytes)').toBeGreaterThan(0)
    fs.rmSync(caminho, { force: true }) // o PDF contém dado real: remove do disco logo após a checagem
    expect(guarda.violacoes, guarda.mensagem()).toEqual([])
  })

  test('nenhuma escrita foi tentada durante a varredura (guarda de somente leitura)', async () => {
    expect(guardaVarredura.violacoes, guardaVarredura.mensagem()).toEqual([])
  })
})
