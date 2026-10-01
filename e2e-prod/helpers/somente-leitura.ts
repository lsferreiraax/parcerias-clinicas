/**
 * GARANTIA DE SOMENTE LEITURA (requisito de segurança nº 1).
 *
 * Duas camadas independentes:
 *  1. Navegador: `instalarGuarda` registra um `route` global no contexto que ABORTA qualquer POST/PUT/PATCH/DELETE,
 *     para QUALQUER host, exceto a allowlist explícita abaixo (login, logout e RPCs reconhecidamente de leitura).
 *     Toda violação é registrada e derruba o teste com mensagem clara (só método + caminho, nunca query/corpo).
 *  2. API direta (helpers/api.ts): o cliente REST só expõe GET e RPCs da allowlist; não existe método de escrita.
 *
 * Como é ABORTADA no navegador, a requisição de escrita nunca chega ao servidor.
 */
import type { BrowserContext } from '@playwright/test'
import { SUPABASE_HOST } from '../config'

export const AUTH_PERMITIDOS = ['/auth/v1/token', '/auth/v1/logout']
export const RPCS_LEITURA = ['listar_perfis_com_email', 'acl_ver', 'acl_editar', 'meu_profissional_id', 'sala_disponivel', 'extrato_profissional', 'extrato_mensal']

const METODOS_LEITURA = new Set(['GET', 'HEAD', 'OPTIONS'])

export function ehLeitura(metodo: string): boolean {
  return METODOS_LEITURA.has(metodo.toUpperCase())
}

/** True se (método, URL) é permitido: leitura, ou escrita da allowlist (Supabase de produção apenas). */
export function escritaPermitida(metodo: string, url: string): boolean {
  if (ehLeitura(metodo)) return true
  const u = new URL(url)
  if (u.host !== SUPABASE_HOST || metodo.toUpperCase() !== 'POST') return false
  if (AUTH_PERMITIDOS.includes(u.pathname)) return true
  const m = u.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)
  return !!m && RPCS_LEITURA.includes(m[1])
}

export function rpcPermitida(funcao: string): boolean {
  return RPCS_LEITURA.includes(funcao)
}

export class GuardaEscrita {
  /** Escritas ABORTADAS fora da allowlist: "METODO host/caminho". */
  violacoes: string[] = []
  /** Quantidade de POSTs da allowlist que passaram (login/RPC de leitura). */
  permitidas = 0

  /** Uso do meta-teste que PROVOCA uma violação de propósito: devolve e zera. */
  consumir(): string[] {
    const v = this.violacoes
    this.violacoes = []
    return v
  }

  mensagem(): string {
    return `ESCRITA BLOQUEADA pelo smoke de producao (nenhum teste pode escrever): ${this.violacoes.join(' | ')}`
  }
}

export async function instalarGuarda(context: BrowserContext): Promise<GuardaEscrita> {
  const g = new GuardaEscrita()
  await context.route('**/*', route => {
    const req = route.request()
    const metodo = req.method()
    if (ehLeitura(metodo)) return route.continue()
    if (escritaPermitida(metodo, req.url())) {
      g.permitidas++
      return route.continue()
    }
    const u = new URL(req.url())
    g.violacoes.push(`${metodo} ${u.host}${u.pathname}`)
    return route.abort('blockedbyclient')
  })
  return g
}
