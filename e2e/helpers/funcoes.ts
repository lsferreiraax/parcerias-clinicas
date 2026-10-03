import { SUPABASE_URL } from '../config'
import { obterAnonKey } from './bundle'

export interface RespFn { status: number; body: any }

export type FuncaoOnda0 = 'psicologia-eventos' | 'backup-banco'

/**
 * Chama uma Edge Function do STAGING (POST). `auth`:
 *   - 'anon'      -> Bearer <chave anon pública> (o que qualquer visitante tem);
 *   - 'nenhum'    -> sem cabeçalho Authorization;
 *   - string      -> Bearer <token de usuário> (só em memória, nunca impresso).
 * Nunca usa a service role (a suíte não a possui).
 */
export async function chamarEdge(nome: FuncaoOnda0, corpo: unknown, auth: 'anon' | 'nenhum' | string): Promise<RespFn> {
  const anon = await obterAnonKey()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth !== 'nenhum') headers.apikey = anon
  if (auth === 'anon') headers.Authorization = `Bearer ${anon}`
  else if (auth !== 'nenhum') headers.Authorization = `Bearer ${auth}`
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${nome}`, { method: 'POST', headers, body: JSON.stringify(corpo) })
  const texto = await r.text()
  let body: any = texto
  try { body = texto ? JSON.parse(texto) : null } catch { /* mantém texto */ }
  return { status: r.status, body }
}

/** Descrição sem dados: status e as chaves/valores curtos da resposta (as mensagens da função são fixas). */
export const descreverFn = (r: RespFn) => `HTTP ${r.status} ${JSON.stringify(r.body)?.slice(0, 160)}`

export const VIEWS_FINANCEIRAS = ['vw_saldo_parceria', 'resumo_por_parceria', 'resumo_profissional'] as const
