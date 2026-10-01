import { REST, PerfilId } from '../config'
import { obterAnonKey } from './bundle'
import { lerSessao } from './sessao'

export interface Resp<T = any> { status: number; ok: boolean; body: T }

export interface OpcoesReq {
  /** Schema do PostgREST (ex.: 'psicologia'); vira Accept-Profile (leitura) ou Content-Profile (escrita). */
  schema?: string
  body?: unknown
  /** Ex.: 'return=representation'. */
  prefer?: string
}

/** Cliente REST do Supabase. Com token = usuário autenticado; sem token = anônimo (só a chave anon pública). */
export class ApiRest {
  constructor(private anonKey: string, private token?: string) {}

  async req<T = any>(metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE', caminho: string, o: OpcoesReq = {}): Promise<Resp<T>> {
    const headers: Record<string, string> = {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.token ?? this.anonKey}`,
    }
    if (o.schema) headers[metodo === 'GET' ? 'Accept-Profile' : 'Content-Profile'] = o.schema
    if (o.body !== undefined) headers['Content-Type'] = 'application/json'
    if (o.prefer) headers.Prefer = o.prefer
    const r = await fetch(`${REST}/${caminho}`, {
      method: metodo, headers, body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    })
    const texto = await r.text()
    let body: any = texto
    try { body = texto ? JSON.parse(texto) : null } catch { /* mantém texto */ }
    return { status: r.status, ok: r.ok, body }
  }

  get<T = any>(caminho: string, schema?: string) { return this.req<T>('GET', caminho, { schema }) }
  post<T = any>(caminho: string, body: unknown, schema?: string, prefer = 'return=representation') {
    return this.req<T>('POST', caminho, { body, schema, prefer })
  }
  patch<T = any>(caminho: string, body: unknown, schema?: string) {
    return this.req<T>('PATCH', caminho, { body, schema, prefer: 'return=representation' })
  }
  delete<T = any>(caminho: string, schema?: string) {
    return this.req<T>('DELETE', caminho, { schema, prefer: 'return=representation' })
  }
  rpc<T = any>(funcao: string, args: unknown = {}, schema?: string) {
    return this.req<T>('POST', `rpc/${funcao}`, { body: args, schema })
  }
}

export async function clienteAnonimo(): Promise<ApiRest> {
  return new ApiRest(await obterAnonKey())
}

/** Cliente autenticado com o token da sessão do storageState do perfil. */
export async function clienteAutenticado(perfil: PerfilId): Promise<ApiRest> {
  const s = lerSessao(perfil)
  if (s.expiresAt && s.expiresAt * 1000 < Date.now() + 30_000) {
    throw new Error(`O token do perfil "${perfil}" expirou; rode a suíte de novo (o projeto setup refaz o login).`)
  }
  return new ApiRest(await obterAnonKey(), s.accessToken)
}

/** "Sem dado": acesso negado (401/403) ou 200 com lista vazia. Nunca 406 nem linhas. */
export function semDados(r: Resp): boolean {
  if (r.status === 401 || r.status === 403) return true
  return r.status === 200 && Array.isArray(r.body) && r.body.length === 0
}

export function descrever(r: Resp): string {
  const corpo = Array.isArray(r.body) ? `${r.body.length} linha(s)` : JSON.stringify(r.body)?.slice(0, 160)
  return `HTTP ${r.status} ${corpo}`
}
