import { BASE_URL, PRODUCAO_REF, STAGING_REF } from '../config'

export interface Bundle { html: string; url: string; js: string }
let cache: Bundle | null = null

/** Baixa o index.html e o bundle principal (/assets/index-*.js) servidos em BASE_URL (sem navegador). */
export async function baixarBundle(): Promise<Bundle> {
  if (cache) return cache
  const r = await fetch(`${BASE_URL}/`, { headers: { 'Cache-Control': 'no-cache' } })
  if (!r.ok) throw new Error(`GET ${BASE_URL}/ devolveu ${r.status}`)
  const html = await r.text()
  const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)
  if (!m) throw new Error('Bundle /assets/index-*.js não encontrado no index.html')
  const jr = await fetch(`${BASE_URL}${m[0]}`)
  if (!jr.ok) throw new Error(`GET ${m[0]} devolveu ${jr.status}`)
  cache = { html, url: `${BASE_URL}${m[0]}`, js: await jr.text() }
  return cache
}

export function refsSupabase(js: string): string[] {
  return [...new Set([...js.matchAll(/https:\/\/([a-z0-9]{20})\.supabase\.co/g)].map(m => m[1]))]
}

/** Extrai a chave anon PÚBLICA do bundle (o mesmo JWT que o navegador usa). Nunca é gravada em arquivo. */
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

export async function obterAnonKey(): Promise<string> {
  return extrairAnonKey((await baixarBundle()).js)
}

/** Trava DINÂMICA: o bundle servido em BASE_URL deve falar SOMENTE com o Supabase do staging. */
export async function garantirStaging(): Promise<void> {
  const { js } = await baixarBundle()
  const refs = refsSupabase(js)
  if (refs.includes(PRODUCAO_REF) || js.includes(PRODUCAO_REF)) {
    throw new Error(`ABORTADO: o bundle em ${BASE_URL} referencia o Supabase de PRODUÇÃO (${PRODUCAO_REF}).`)
  }
  if (refs.length !== 1 || refs[0] !== STAGING_REF) {
    throw new Error(`ABORTADO: o bundle em ${BASE_URL} não aponta exclusivamente para o staging (${STAGING_REF}); encontrado: ${refs.join(', ') || 'nenhum'}.`)
  }
}
