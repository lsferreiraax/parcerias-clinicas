/**
 * Configuração do SMOKE DE PRODUÇÃO. NENHUMA credencial aqui: e-mails e senhas vêm só de variáveis de ambiente
 * (PROD_SMOKE_EMAIL / PROD_SMOKE_PASSWORD e, opcionalmente, PROD_SMOKE_EMAIL_FIN / PROD_SMOKE_PASSWORD_FIN).
 *
 * Esta pasta é o INVERSO da suíte `App/e2e` (que só roda em staging): aqui só se roda em produção.
 * Ver `travaProducao` (estática) e `garantirProducao` (dinâmica, em helpers/bundle.ts).
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

export const PRODUCAO_REF = 'nxahdyfrjrtwscolexdv'
export const STAGING_REF = 'ebupuuthlbusnsivonxz'
/** Domínio estável de produção (alias do projeto no Vercel; serve o mesmo bundle do deploy Production). */
export const PROD_URL_PADRAO = 'https://parcerias-clinicas.vercel.app'

export const BASE_URL = (process.env.PROD_BASE_URL || PROD_URL_PADRAO).replace(/\/+$/, '')
export const SUPABASE_HOST = `${PRODUCAO_REF}.supabase.co`
export const SUPABASE_URL = `https://${SUPABASE_HOST}`
export const REST = `${SUPABASE_URL}/rest/v1`
export const STORAGE_KEY = `sb-${PRODUCAO_REF}-auth-token`

export const AUTH_DIR = path.join(__dirname, '.auth-prod')

export type PerfilId = 'admin' | 'financeiro'
export function caminhoAuth(perfil: PerfilId): string {
  return path.join(AUTH_DIR, `${perfil}.json`)
}

export const psicologiaExposta = (): boolean => process.env.PROD_PSICOLOGIA_EXPOSTA === 'sim'

export function financeiroConfigurado(): boolean {
  return !!(process.env.PROD_SMOKE_EMAIL_FIN && process.env.PROD_SMOKE_PASSWORD_FIN)
}

/** Credenciais do perfil, só do ambiente. As mensagens de erro NUNCA repetem valores. */
export function credenciais(perfil: PerfilId): { email: string; senha: string } {
  const [ve, vs] = perfil === 'admin'
    ? ['PROD_SMOKE_EMAIL', 'PROD_SMOKE_PASSWORD']
    : ['PROD_SMOKE_EMAIL_FIN', 'PROD_SMOKE_PASSWORD_FIN']
  const email = process.env[ve]
  const senha = process.env[vs]
  if (!email || !senha) {
    throw new Error(`Defina ${ve} e ${vs} no seu terminal (nunca em arquivo). PowerShell: $env:${ve}='...'; $env:${vs}='...'`)
  }
  return { email, senha }
}

/** Versão esperada do app: PROD_VERSAO_ESPERADA ou a versão de App/package.json (da branch main promovida). */
export function versaoEsperada(): string {
  if (process.env.PROD_VERSAO_ESPERADA) return process.env.PROD_VERSAO_ESPERADA
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))
    return String(pkg.version)
  } catch {
    return ''
  }
}

/**
 * Trava ESTÁTICA (roda ao carregar o playwright.config.ts, inclusive em --list):
 *  1. exige PROD_SMOKE_CONFIRMA=sim (evita execução acidental);
 *  2. aborta se qualquer URL configurada citar o staging ou outro Supabase;
 *  3. aborta se o host não for o domínio de produção do app.
 * A trava DINÂMICA (o bundle servido só fala com o Supabase de produção) está em `garantirProducao`.
 */
export function travaProducao(): void {
  if (process.env.PROD_SMOKE_CONFIRMA !== 'sim') {
    throw new Error("ABORTADO: este projeto roda contra PRODUCAO. Confirme conscientemente com PROD_SMOKE_CONFIRMA=sim (PowerShell: $env:PROD_SMOKE_CONFIRMA='sim').")
  }
  const candidatos = [process.env.PROD_BASE_URL, process.env.PROD_SUPABASE_URL, process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL]
  for (const c of candidatos) {
    if (!c) continue
    if (c.includes(STAGING_REF) || /staging/i.test(c)) {
      throw new Error(`ABORTADO: uma URL configurada aponta para o STAGING (${STAGING_REF}). Este projeto só roda em produção.`)
    }
    if (/supabase\.co/.test(c) && !c.includes(PRODUCAO_REF)) {
      throw new Error(`ABORTADO: URL do Supabase diferente da produção (${PRODUCAO_REF}).`)
    }
  }
  const host = new URL(BASE_URL).host
  const ehProducao = /^parcerias-clinicas(-elleve1)?\.vercel\.app$/.test(host)
  if (!ehProducao && process.env.PROD_PERMITIR_OUTRA_URL !== 'sim') {
    throw new Error(
      `ABORTADO: PROD_BASE_URL (${host}) não parece ser o domínio de produção (parcerias-clinicas.vercel.app). ` +
      'Se for um domínio de produção legítimo, defina PROD_PERMITIR_OUTRA_URL=sim (a trava dinâmica ainda confere o Supabase do bundle).',
    )
  }
}
