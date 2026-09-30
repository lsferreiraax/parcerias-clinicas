import type { Page } from '@playwright/test'
import { SUPABASE_URL } from '../config'

export interface ErroApi { metodo: string; url: string; status: number }

/**
 * Coleta respostas de API com status >= 400 (evento `response`, NÃO o buffer de performance) e erros de console.
 * Erros provocados de propósito devem ser declarados com `ignorar(...)` antes da ação.
 */
export class ColetorErros {
  apiErros: ErroApi[] = []
  consoleErros: string[] = []
  private ignorados: RegExp[] = []

  constructor(page: Page) {
    page.on('response', r => {
      const url = r.url()
      if (r.status() >= 400 && url.startsWith(SUPABASE_URL) && !this.ehIgnorado(url)) {
        this.apiErros.push({ metodo: r.request().method(), url: this.curta(url), status: r.status() })
      }
    })
    page.on('console', m => {
      if (m.type() !== 'error') return
      const url = m.location().url ?? ''
      if (this.ehIgnorado(url) || this.ehIgnorado(m.text())) return
      this.consoleErros.push(m.text().slice(0, 300))
    })
    page.on('pageerror', e => this.consoleErros.push(`pageerror: ${String(e.message).slice(0, 300)}`))
  }

  private curta(url: string) { return url.replace(SUPABASE_URL, '') }
  private ehIgnorado(s: string) { return this.ignorados.some(re => re.test(s)) }

  /** Erros provocados de propósito (ex.: POST proibido): ignora URLs/mensagens que casem. */
  ignorar(re: RegExp) { this.ignorados.push(re) }

  limpar() { this.apiErros = []; this.consoleErros = [] }

  resumoApi(): string[] { return this.apiErros.map(e => `${e.status} ${e.metodo} ${e.url}`) }
}
