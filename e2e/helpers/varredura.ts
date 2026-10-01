import type { Browser, Page } from '@playwright/test'
import { ColetorErros } from './coletor'
import { abrirRota, aguardarConteudo, textoDoMain } from './ui'
import { acharUuids } from './uuid'

export interface ResultadoRota {
  rota: string
  destino: string
  titulo: string
  uuids: string[]
  apiErros: string[]
  consoleErros: string[]
  /** Observações conhecidas (ex.: DT8 excluído da checagem de UUID). */
  notas: string[]
}

/**
 * Passos extras por rota, executados antes de ler o texto. Na Agenda abre o formulário de sessão e oculta o
 * select "Parceria" da checagem de UUID (DT8 conhecido: "uuid — Nome"; coberto por teste próprio com test.fail).
 */
const EXTRAS: Record<string, (page: Page, r: ResultadoRota) => Promise<string[]>> = {
  '/agenda': async (page, r) => {
    await page.getByRole('button', { name: /Nova Sessão/ }).click()
    await page.locator('div.fixed.inset-0 h2', { hasText: 'Nova Sessão' }).waitFor()
    r.notas.push('DT8: select "Parceria" do formulário de sessão excluído da checagem de UUID')
    // select cujo primeiro option é "Sem vínculo" = Parceria (marcado por JS puro; `:text-is` só existe em locators do Playwright)
    await page.evaluate(() => {
      document.querySelectorAll('main select, div.fixed.inset-0 select').forEach(sel => {
        const opts = Array.from((sel as HTMLSelectElement).options)
        if (opts.some(o => o.value === '' && (o.textContent ?? '').trim() === 'Sem vínculo')) sel.setAttribute('data-qa-parceria', '1')
      })
    })
    return ['select[data-qa-parceria="1"]']
  },
}

/** Visita cada rota com UM contexto e coleta UUIDs no main, erros de API (>=400) e erros de console. */
export async function varrerRotas(
  browser: Browser,
  use: { baseURL?: string; storageState?: unknown },
  rotas: string[],
): Promise<ResultadoRota[]> {
  const context = await browser.newContext({
    baseURL: use.baseURL,
    storageState: use.storageState as string,
    serviceWorkers: 'block',
    locale: 'pt-BR',
    viewport: { width: 1366, height: 800 },
  })
  const page = await context.newPage()
  const coletor = new ColetorErros(page)
  const resultados: ResultadoRota[] = []
  try {
    for (const rota of rotas) {
      coletor.limpar()
      const r: ResultadoRota = { rota, destino: '', titulo: '', uuids: [], apiErros: [], consoleErros: [], notas: [] }
      try {
        r.destino = await abrirRota(page, rota)
        // <main> vazio (instabilidade momentânea): recarrega uma vez antes de ler título/UUIDs
        if (r.destino === rota && (await page.locator('main h1').count()) === 0) {
          await aguardarConteudo(page, { recarregar: true, tolerante: true })
        }
        r.titulo = ((await page.locator('main h1').first().textContent().catch(() => '')) ?? '').trim()
        const ocultar = EXTRAS[rota] ? await EXTRAS[rota](page, r) : []
        r.uuids = acharUuids(await textoDoMain(page, ocultar))
        if (EXTRAS[rota]) await page.keyboard.press('Escape').catch(() => undefined)
      } catch (e) {
        r.notas.push(`erro na varredura: ${(e as Error).message.split('\n')[0]}`)
      }
      r.apiErros = coletor.resumoApi()
      r.consoleErros = [...coletor.consoleErros]
      resultados.push(r)
    }
  } finally {
    await context.close()
  }
  return resultados
}
