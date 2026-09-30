import { BASE_URL, PRODUCAO_REF, STAGING_REF } from '../config'

export interface Bundle { html: string; url: string; js: string; status: number; headers: Headers }
let cache: Bundle | null = null

/** Baixa o index.html e o bundle principal servidos em BASE_URL (GET, sem navegador). */
export async function baixarBundle(): Promise<Bundle> {
  if (cache) return cache
  const r = await fetch(`${BASE_URL}/`, { headers: { 'Cache-Control': 'no-cache' } })
  if (!r.ok) throw new Error(`GET / devolveu ${r.status}`)
  const html = await r.text()
  const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)
  if (!m) throw new Error('Bundle /assets/index-*.js não encontrado no index.html')
  const jr = await fetch(`${BASE_URL}${m[0]}`)
  if (!jr.ok) throw new Error(`GET ${m[0]} devolveu ${jr.status}`)
  cache = { html, url: `${BASE_URL}${m[0]}`, js: await jr.text(), status: r.status, headers: r.headers }
  return cache
}

export function refsSupabase(js: string): string[] {
  return [...new Set([...js.matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.co/g)].map(m => m[1]))]
}

/** Chave anon PÚBLICA embutida no bundle (a mesma que o navegador usa). Fica só em memória. */
export function extrairAnonKey(js: string): string {
  const jwts = [...new Set(js.match(/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g) ?? [])]
  for (const j of jwts) {
    try {
      const p = JSON.parse(Buffer.from(j.split('.')[1], 'base64url').toString('utf-8'))
      if (p.role === 'anon') return j
    } catch { /* ignora */ }
  }
  throw new Error('Chave anon não encontrada no bundle')
}

export function payloadJwt(jwt: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf-8'))
}

/**
 * Trava DINÂMICA: o bundle servido em BASE_URL deve falar SOMENTE com o Supabase de produção.
 * Toda obtenção da chave anon passa por aqui: nenhuma chamada à API roda se a trava falhar.
 */
export async function garantirProducao(): Promise<void> {
  const { js } = await baixarBundle()
  const refs = refsSupabase(js)
  if (refs.includes(STAGING_REF) || js.includes(STAGING_REF)) {
    throw new Error(`ABORTADO: o bundle em ${BASE_URL} referencia o Supabase de STAGING (${STAGING_REF}).`)
  }
  if (refs.length !== 1 || refs[0] !== PRODUCAO_REF) {
    throw new Error(`ABORTADO: o bundle em ${BASE_URL} não aponta exclusivamente para a produção (${PRODUCAO_REF}); refs encontrados: ${refs.length}.`)
  }
}

export async function obterAnonKey(): Promise<string> {
  await garantirProducao()
  return extrairAnonKey((await baixarBundle()).js)
}
