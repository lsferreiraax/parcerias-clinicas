import { test, expect } from '../../fixtures'
import { PERFIS } from '../../helpers/rotas'
import { MENU_LABEL, PRINCIPAIS_MOBILE } from '../../helpers/rotas'
import { abrirRota, itensDoMenu, rolagemHorizontal } from '../../helpers/ui'
import { usuarioLogado } from '../../helpers/sessao'
import { EMAILS, PerfilId } from '../../config'
import { ResultadoRota, varrerRotas } from '../../helpers/varredura'

/**
 * Regressões transversais: rodam uma vez em CADA projeto de perfil logado (admin, financeiro, profissional,
 * recepcionista). O perfil vem do nome do projeto; as rotas esperadas vêm de helpers/rotas.ts.
 */

let varredura: ResultadoRota[] = []

test.describe('Regressões transversais', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(300_000) // varredura de até 19 telas; cada uma pode recarregar uma vez
    const perfil = PERFIS[testInfo.project.name as PerfilId]
    varredura = await varrerRotas(browser, testInfo.project.use, perfil.permitidas)
  })

  test('sessão: o usuário logado é o do perfil testado', async ({ page, perfil }) => {
    await page.goto('/')
    const u = await usuarioLogado(page)
    expect(u?.email).toBe(EMAILS[perfil.id])
  })

  test('todas as telas permitidas abrem (sem cair em /sem-acesso nem redirecionar)', async ({ perfil }) => {
    for (const rota of perfil.permitidas) {
      const r = varredura.find(v => v.rota === rota)!
      expect.soft(r.notas.filter(n => n.startsWith('erro')), `varredura de ${rota}`).toEqual([])
      expect.soft(r.destino, `rota ${rota} deveria abrir`).toBe(rota)
      expect.soft(r.titulo, `rota ${rota} sem título`).not.toBe('')
      expect.soft(r.titulo, `rota ${rota} caiu em Acesso Restrito`).not.toMatch(/Acesso Restrito/i)
    }
  })

  test('0 UUIDs no texto de main nas telas permitidas', async ({ perfil }, testInfo) => {
    for (const rota of perfil.permitidas) {
      const r = varredura.find(v => v.rota === rota)!
      r.notas.filter(n => n.startsWith('DT')).forEach(n => testInfo.annotations.push({ type: 'nota', description: `${rota}: ${n}` }))
      expect.soft(r.uuids, `UUID visível em ${rota}`).toEqual([])
    }
  })

  test('0 respostas de API >= 400 nas telas permitidas', async ({ perfil }) => {
    for (const rota of perfil.permitidas) {
      const r = varredura.find(v => v.rota === rota)!
      expect.soft(r.apiErros, `erros de API em ${rota}`).toEqual([])
    }
  })

  test('console sem erros nas telas permitidas', async ({ perfil }) => {
    for (const rota of perfil.permitidas) {
      const r = varredura.find(v => v.rota === rota)!
      expect.soft(r.consoleErros, `erros de console em ${rota}`).toEqual([])
    }
  })

  test('menu == rotas permitidas (mesma contagem e mesmos destinos)', async ({ page, perfil }) => {
    await page.goto('/')
    await abrirRota(page, perfil.permitidas[0])
    const menu = await itensDoMenu(page)
    expect(menu.length, `itens no menu: ${menu.map(m => m.texto).join(', ')}`).toBe(perfil.permitidas.length)
    expect(menu.map(m => m.href).sort()).toEqual([...perfil.permitidas].sort())
    expect(menu.map(m => m.texto).sort()).toEqual(perfil.permitidas.map(r => MENU_LABEL[r]).sort())
  })

  test('rotas bloqueadas não abrem (vão ao destino esperado)', async ({ page, perfil }) => {
    await page.goto('/')
    await abrirRota(page, perfil.permitidas[0])
    for (const b of perfil.bloqueadas) {
      const final = await abrirRota(page, b.rota)
      expect.soft(b.destinos, `${b.rota} terminou em ${final}`).toContain(final)
      expect.soft(final, `${b.rota} não pode permanecer aberta`).not.toBe(b.rota)
    }
  })

  test('sem rolagem horizontal em 375px nas telas principais', async ({ page, perfil }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await abrirRota(page, perfil.permitidas[0])
    const telas = perfil.permitidas.filter(r => PRINCIPAIS_MOBILE.includes(r))
    for (const rota of telas) {
      const destino = await abrirRota(page, rota)
      expect.soft(destino).toBe(rota)
      const s = await rolagemHorizontal(page)
      expect.soft(s.pagina, `rolagem horizontal da página em ${rota}`).toBeLessThanOrEqual(1)
      expect.soft(s.conteudo, `rolagem horizontal do conteúdo em ${rota}`).toBeLessThanOrEqual(1)
    }
  })
})
