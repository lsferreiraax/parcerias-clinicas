import type { Page } from '@playwright/test'
import { SUPABASE_URL } from '../config'

/**
 * Coleta respostas da API do Supabase com status >= 400 (evento `response`). Guarda SÓ método, status e CAMINHO
 * (sem query string: filtros podem conter nome/CPF de paciente). Nenhum corpo é lido.
 */
export class ColetorErros {
  apiErros: string[] = []
  constructor(page: Page) {
    page.on('response', r => {
      if (r.status() >= 400 && r.url().startsWith(SUPABASE_URL)) {
        this.apiErros.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`)
      }
    })
  }
  limpar() { this.apiErros = [] }
}
