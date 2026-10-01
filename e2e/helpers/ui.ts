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

/** Como `campo`, mas casa o rótulo INTEIRO (ex.: "Perfil" não casa com "Perfil de Acesso"). */
export function campoExato(escopo: Page | Locator, rotulo: string): Locator {
  return escopo
    .locator(`xpath=.//label[normalize-space(.)="${rotulo}"]/following-sibling::*[self::input or self::select or self::textarea][1]`)
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
  // Rotas que redirecionam (guards) não têm título a esperar; nas demais, espera o h1 (dashboards carregam devagar).
  const ficouNaRota = new URL(page.url()).pathname === rota
  // Na própria rota: espera o h1 (recarrega UMA vez se o <main> continuar vazio). Redirecionada: espera curta.
  await aguardarConteudo(page, ficouNaRota ? { recarregar: true, tolerante: true } : { recarregar: false, tolerante: true, timeout: 10_000 })
  await aguardarRede(page)
  return new URL(page.url()).pathname
}

/**
 * Espera o conteúdo real da página: o `h1` dentro de <main> visível e os textos "Carregando..." sumindo.
 * Se o <main> continuar sem conteúdo depois de `esperaInicialMs` (instabilidade de rede/carga), recarrega UMA vez.
 * `tolerante`: não lança se o h1 não aparecer (rotas bloqueadas/redirecionadas); quem chama valida o resultado.
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

/**
 * Rolagem horizontal: da página e do contêiner de conteúdo (main > div.overflow-auto).
 * `ofensores` lista (1) elementos que passam da largura da tela e NÃO estão dentro de um contêiner com rolagem própria
 * (tabelas em overflow-x-auto são legítimas) e (2) elementos cujo conteúdo é maior que a própria caixa sem rolagem própria.
 */
export async function rolagemHorizontal(page: Page): Promise<{ pagina: number; conteudo: number; ofensores: string[] }> {
  return page.evaluate(() => {
    const de = document.documentElement
    const main = document.querySelector('main')
    const cont = document.querySelector('main .overflow-auto') as HTMLElement | null
    const largura = de.clientWidth
    const descreve = (el: Element) => {
      const cls = ((el as HTMLElement).className?.toString() ?? '').split(/\s+/).filter(Boolean).slice(0, 3).join('.')
      const texto = ((el as HTMLElement).innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 30)
      return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${texto}"`
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

/** Hrefs e rótulos do menu lateral desktop (o sufixo numérico do badge, ex.: "Repasses3", é removido). */
export async function itensDoMenu(page: Page): Promise<{ href: string; texto: string }[]> {
  return page.locator('aside').first().locator('nav a').evaluateAll(as =>
    as.map(a => ({ href: new URL((a as HTMLAnchorElement).href).pathname, texto: (a.textContent ?? '').trim().replace(/\d+$/, '').trim() })),
  )
}
