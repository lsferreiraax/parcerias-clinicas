import { REST } from '../config'
import type { PerfilId } from '../config'
import { obterAnonKey } from './bundle'
import { rpcPermitida } from './somente-leitura'
import { lerSessao } from './sessao'

export interface Resp { status: number; body: any }

/**
 * Cliente REST SOMENTE LEITURA. Só existem `get` e `rpc` (e este só aceita as funções da allowlist de leitura).
 * Não há método de escrita: um teste não consegue criar/editar/apagar nada por aqui.
 */
export class ApiLeitura {
  constructor(private anonKey: string, private token?: string) {}

  private async chamar(metodo: 'GET' | 'POST', caminho: string, schema?: string, body?: unknown): Promise<Resp> {
    const headers: Record<string, string> = {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.token ?? this.anonKey}`,
    }
    if (schema) headers[metodo === 'GET' ? 'Accept-Profile' : 'Content-Profile'] = schema
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const r = await fetch(`${REST}/${caminho}`, { method: metodo, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
    const texto = await r.text()
    let corpo: any = texto
    try { corpo = texto ? JSON.parse(texto) : null } catch { /* mantém texto */ }
    return { status: r.status, body: corpo }
  }

  get(caminho: string, schema?: string) { return this.chamar('GET', caminho, schema) }

  rpc(funcao: string, args: unknown = {}, schema?: string) {
    if (!rpcPermitida(funcao)) throw new Error(`RECUSADO: a RPC "${funcao}" não está na allowlist de leitura do smoke.`)
    return this.chamar('POST', `rpc/${funcao}`, schema, args)
  }
}

export async function clienteAnonimo(): Promise<ApiLeitura> {
  return new ApiLeitura(await obterAnonKey())
}

/** Cliente com o token da sessão do storageState do perfil (leitura). */
export async function clienteAutenticado(perfil: PerfilId): Promise<ApiLeitura> {
  const s = lerSessao(perfil)
  if (s.expiresAt && s.expiresAt * 1000 < Date.now() + 30_000) {
    throw new Error(`O token do perfil "${perfil}" expirou; rode de novo (o projeto de login refaz a sessão).`)
  }
  return new ApiLeitura(await obterAnonKey(), s.accessToken)
}

/** "Sem dado": 401/403 ou 200 com lista vazia. `schemaNaoExposto` aceita também 406 (PGRST106). Nunca linhas. */
export function semDados(r: Resp, schemaNaoExposto = false): boolean {
  if (r.status === 401 || r.status === 403) return true
  if (schemaNaoExposto && r.status === 406) return true
  return r.status === 200 && Array.isArray(r.body) && r.body.length === 0
}

/** Descrição SEM DADO REAL: só status, contagem de linhas e o código de erro do PostgREST. */
export function descrever(r: Resp): string {
  if (Array.isArray(r.body)) return `HTTP ${r.status}, ${r.body.length} linha(s)`
  const code = r.body && typeof r.body === 'object' && 'code' in r.body ? ` code=${String(r.body.code).slice(0, 20)}` : ''
  return `HTTP ${r.status}${code}`
}
