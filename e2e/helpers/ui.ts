import type { Locator, Page } from '@playwright/test'
import { acharUuids } from './uuid'

/**
 * Os formulários do app usam <label> sem `for`/id: o controle é o irmão seguinte do label.
 * `escopo` costuma ser o modal (`modalAberto(page)`) ou a página.
 */
export function campo(escopo: Page | Locator, rotulo: string): Locator {
  return escopo
    .locator(`xpath=.//label[starts-with(normalize-space(.), "${rotulo}")]/following-sibling::*[self::input or self::select or self::textarea][1]`)
    .first()
}

/** Último modal/diálogo aberto (Modal do app e modais da Agenda/Pacientes usam `fixed inset-0`). */
export function modalAberto(page: Page): Locator {
  return page.locator('div.fixed.inset-0').last()
}

/** Data local (YYYY-MM-DD) deslocada em `dias` a partir de hoje. */
export function dataLocal(dias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export async function aguardarRede(page: Page, ms = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: ms }).catch(() => { /* telas com polling: segue */ })
}

/**
 * Abre uma rota como o usuário faria dentro do SPA (pushState + popstate) e espera o caminho final estabilizar
 * (os guards redirecionam por <Navigate>). Devolve o pathname final.
 */
export async function abrirRota(page: Page, rota: string): Promise<string> {
  const origem = new URL(page.url() === 'about:blank' ? 'http://x' : page.url())
  if (page.url() === 'about:blank' || origem.pathname.startsWith('/login')) {
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
  await aguardarRede(page)
  return new URL(page.url()).pathname
}

/** Texto visível de <main>, opcionalmente ocultando elementos (ex.: o select "Parceria" do DT8). */
export async function textoDoMain(page: Page, ocultarSeletores: string[] = []): Promise<string> {
  return page.evaluate(sels => {
    const main = document.querySelector('main')
    if (!main) return ''
    const ocultados: { el: HTMLElement; antigo: string }[] = []
    for (const s of sels) {
      main.querySelectorAll<HTMLElement>(s).forEach(el => { ocultados.push({ el, antigo: el.style.display }); el.style.display = 'none' })
    }
    const texto = (main as HTMLElement).innerText
    ocultados.forEach(o => { o.el.style.display = o.antigo })
    return texto
  }, ocultarSeletores)
}

export async function uuidsNoMain(page: Page, ocultarSeletores: string[] = []): Promise<string[]> {
  return acharUuids(await textoDoMain(page, ocultarSeletores))
}

/** Rolagem horizontal: da página e do contêiner de conteúdo (main > div.overflow-auto). */
export async function rolagemHorizontal(page: Page): Promise<{ pagina: number; conteudo: number }> {
  return page.evaluate(() => {
    const de = document.documentElement
    const cont = document.querySelector('main .overflow-auto') as HTMLElement | null
    return {
      pagina: Math.max(0, de.scrollWidth - de.clientWidth),
      conteudo: cont ? Math.max(0, cont.scrollWidth - cont.clientWidth) : 0,
    }
  })
}

/** Hrefs e rótulos do menu lateral desktop. */
export async function itensDoMenu(page: Page): Promise<{ href: string; texto: string }[]> {
  return page.locator('aside').first().locator('nav a').evaluateAll(as =>
    as.map(a => ({ href: new URL((a as HTMLAnchorElement).href).pathname, texto: (a.textContent ?? '').trim() })),
  )
}
