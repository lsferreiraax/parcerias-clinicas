import type { Page } from '@playwright/test'
import { contarUuids } from './uuid'

export async function aguardarRede(page: Page, ms = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: ms }).catch(() => { /* telas com polling: segue */ })
}

/**
 * Espera o `h1` de <main> e o fim dos "Carregando...". Se o <main> seguir vazio, recarrega UMA vez (leitura).
 * `tolerante`: não lança se o h1 não aparecer (rotas bloqueadas); quem chama valida o resultado.
 */
export async function aguardarConteudo(
  page: Page,
  o: { timeout?: number; esperaInicialMs?: number; recarregar?: boolean; tolerante?: boolean } = {},
): Promise<void> {
  const { timeout = 30_000, esperaInicialMs = 15_000, recarregar = true, tolerante = false } = o
  const h1 = page.locator('main h1').first()
  const esperar = async (ms: number) => {
    await h1.waitFor({ state: 'visible', timeout: ms })
    await page.getByText(/^Carregando/).first().waitFor({ state: 'hidden', timeout: ms }).catch(() => { /* segue */ })
  }
  try {
    await esperar(recarregar ? esperaInicialMs : timeout)
  } catch (e) {
    if (recarregar) {
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined)
      try { await esperar(timeout) } catch (e2) { if (!tolerante) throw e2 }
    } else if (!tolerante) {
      throw e
    }
  }
}

/** Abre uma rota como o usuário (pushState + popstate no SPA) e devolve o pathname final (guards redirecionam). */
export async function abrirRota(page: Page, rota: string): Promise<string> {
  const atualUrl = page.url()
  if (atualUrl === 'about:blank' || new URL(atualUrl).pathname.startsWith('/login')) {
    await page.goto(rota)
  } else {
    await page.evaluate(r => {
      history.pushState({}, '', r)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, rota)
  }
  let anterior = ''
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250)
    const atual = new URL(page.url()).pathname
    const temTitulo = (await page.locator('main h1').count()) > 0
    if (atual === anterior && temTitulo) break
    anterior = atual
  }
  const ficouNaRota = new URL(page.url()).pathname === rota
  await aguardarConteudo(page, ficouNaRota ? { recarregar: true, tolerante: true } : { recarregar: false, tolerante: true, timeout: 10_000 })
  await aguardarRede(page)
  return new URL(page.url()).pathname
}

/** Conta UUIDs no texto visível de <main> (avaliado em memória; o texto não é devolvido nem impresso). */
export async function uuidsNoMain(page: Page): Promise<number> {
  const texto = await page.evaluate(() => (document.querySelector('main') as HTMLElement | null)?.innerText ?? '')
  return contarUuids(texto)
}

/**
 * Rolagem horizontal da página e do contêiner de conteúdo. `ofensores` traz SÓ tag + classes + px
 * (nunca o texto do elemento: LGPD).
 */
export async function rolagemHorizontal(page: Page): Promise<{ pagina: number; conteudo: number; ofensores: string[] }> {
  return page.evaluate(() => {
    const de = document.documentElement
    const main = document.querySelector('main')
    const cont = document.querySelector('main .overflow-auto') as HTMLElement | null
    const largura = de.clientWidth
    const descreve = (el: Element) => {
      const cls = ((el as HTMLElement).className?.toString() ?? '').split(/\s+/).filter(Boolean).slice(0, 3).join('.')
      return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`
    }
    const clipado = (el: Element) => {
      for (let a = el.parentElement; a && a !== main && a !== cont; a = a.parentElement) {
        if (getComputedStyle(a).overflowX !== 'visible') return true
      }
      return false
    }
    const achados: { txt: string; px: number }[] = []
    document.querySelectorAll('main *').forEach(el => {
      const h = el as HTMLElement
      const r = h.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      const fora = Math.round(r.right - largura)
      if (fora > 1 && !clipado(el)) achados.push({ txt: `${descreve(el)} passa ${fora}px da tela`, px: fora })
      const interno = h.scrollWidth - h.clientWidth
      if (interno > 1 && h.clientWidth > 0 && getComputedStyle(h).overflowX === 'visible') {
        achados.push({ txt: `${descreve(el)} conteúdo ${interno}px maior que a caixa`, px: interno })
      }
    })
    achados.sort((x, y) => y.px - x.px)
    return {
      pagina: Math.max(0, de.scrollWidth - de.clientWidth),
      conteudo: cont ? Math.max(0, cont.scrollWidth - cont.clientWidth) : 0,
      ofensores: achados.slice(0, 6).map(o => o.txt),
    }
  })
}

/** Hrefs do menu lateral desktop (só caminhos; sem rótulos). */
export async function hrefsDoMenu(page: Page): Promise<string[]> {
  return page.locator('aside').first().locator('nav a').evaluateAll(as =>
    as.map(a => new URL((a as HTMLAnchorElement).href).pathname))
}
