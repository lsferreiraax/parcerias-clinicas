/**
 * Configuração central da suíte. NENHUMA senha aqui: a senha vem só de E2E_PASSWORD (variável de ambiente).
 * A suíte roda SOMENTE contra o staging; ver `travaStaging` (estática) e `garantirStaging` (dinâmica, nos testes).
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

export const STAGING_REF = 'ebupuuthlbusnsivonxz'
export const PRODUCAO_REF = 'nxahdyfrjrtwscolexdv'
export const STAGING_URL_PADRAO = 'https://parcerias-clinicas-git-staging-elleve1.vercel.app'

export const BASE_URL = (process.env.E2E_BASE_URL || STAGING_URL_PADRAO).replace(/\/+$/, '')
export const SUPABASE_URL = `https://${STAGING_REF}.supabase.co`
export const REST = `${SUPABASE_URL}/rest/v1`
export const STORAGE_KEY = `sb-${STAGING_REF}-auth-token`

export const AUTH_DIR = path.join(__dirname, '.auth')

export type PerfilId = 'admin' | 'financeiro' | 'profissional' | 'recepcionista'
export const PERFIS_LOGADOS: PerfilId[] = ['admin', 'financeiro', 'profissional', 'recepcionista']

/** E-mails dos usuários de teste do staging (sobrescreva com E2E_EMAIL_<PERFIL> se mudarem). */
export const EMAILS: Record<PerfilId, string> = {
  admin: process.env.E2E_EMAIL_ADMIN || 'admin@staging.test',
  financeiro: process.env.E2E_EMAIL_FINANCEIRO || 'financeiro@staging.test',
  profissional: process.env.E2E_EMAIL_PROFISSIONAL || 'profissional@staging.test',
  recepcionista: process.env.E2E_EMAIL_RECEPCIONISTA || 'recepcionista@staging.test',
}

/** Profissional vinculado ao usuário `profissional@` (Dra. Ana Lima, psi1). */
export const PROFISSIONAL_ANA_ID = 'b71d5113-08da-4405-8c7b-75066a94f4fb'

export const PREFIXO_QA = 'QA-'

export function caminhoAuth(perfil: PerfilId): string {
  return path.join(AUTH_DIR, `${perfil}.json`)
}

export function lerSenha(): string {
  const s = process.env.E2E_PASSWORD
  if (!s) {
    throw new Error(
      'Defina a variável de ambiente E2E_PASSWORD no seu terminal (ela nunca é gravada em arquivo). ' +
      "PowerShell: $env:E2E_PASSWORD='...'   bash: export E2E_PASSWORD='...'",
    )
  }
  return s
}

/** Versão esperada do app: E2E_VERSAO_ESPERADA ou a versão do App/package.json. */
export function versaoEsperada(): string {
  if (process.env.E2E_VERSAO_ESPERADA) return process.env.E2E_VERSAO_ESPERADA
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))
    return String(pkg.version)
  } catch {
    return ''
  }
}

/**
 * Trava ESTÁTICA (roda ao carregar o playwright.config.ts): aborta se BASE_URL ou qualquer URL do Supabase
 * configurada apontar para produção. A trava DINÂMICA (bundle servido em BASE_URL) está em `garantirStaging`.
 */
export function travaStaging(): void {
  const candidatos = [process.env.E2E_BASE_URL, process.env.E2E_SUPABASE_URL, process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL]
  for (const c of candidatos) {
    if (c && c.includes(PRODUCAO_REF)) {
      throw new Error(`ABORTADO: uma URL configurada aponta para o Supabase de PRODUÇÃO (${PRODUCAO_REF}). Esta suíte só roda no staging.`)
    }
    if (c && /supabase\.co/.test(c) && !c.includes(STAGING_REF)) {
      throw new Error(`ABORTADO: URL do Supabase diferente do staging (${STAGING_REF}): ${c}`)
    }
  }
  const host = new URL(BASE_URL).host
  const ehLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)
  const ehVercelStaging = /^parcerias-clinicas-git-staging-.*\.vercel\.app$/.test(host)
  if (!ehLocal && !ehVercelStaging && process.env.E2E_PERMITIR_OUTRA_URL !== 'sim') {
    throw new Error(
      `ABORTADO: BASE_URL (${host}) não parece ser o staging. Esperado: parcerias-clinicas-git-staging-*.vercel.app. ` +
      'Se for um domínio de staging legítimo, defina E2E_PERMITIR_OUTRA_URL=sim (a trava dinâmica ainda confere o Supabase do bundle).',
    )
  }
}
