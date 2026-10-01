import * as fs from 'node:fs'
import type { Page } from '@playwright/test'
import { PerfilId, STORAGE_KEY, caminhoAuth } from '../config'

export interface SessaoSupabase {
  accessToken: string
  expiresAt: number
  userId: string
  email: string
}

function parseSessao(raw: string): SessaoSupabase {
  const s = JSON.parse(raw)
  return { accessToken: s.access_token, expiresAt: s.expires_at ?? 0, userId: s.user?.id, email: s.user?.email }
}

/** Lê a sessão gravada em .auth/<perfil>.json (storageState) — fonte do token para as provas de RLS pela API. */
export function lerSessao(perfil: PerfilId): SessaoSupabase {
  const arq = caminhoAuth(perfil)
  if (!fs.existsSync(arq)) throw new Error(`Sessão do perfil "${perfil}" não encontrada (${arq}). Rode o projeto setup (precisa de E2E_PASSWORD).`)
  const st = JSON.parse(fs.readFileSync(arq, 'utf-8'))
  for (const o of st.origins ?? []) {
    for (const item of o.localStorage ?? []) {
      if (item.name === STORAGE_KEY || /auth-token$/.test(item.name)) return parseSessao(item.value)
    }
  }
  throw new Error(`Token não encontrado em ${arq}`)
}

/** Usuário logado lido do localStorage da página (sem expor o token). */
export async function usuarioLogado(page: Page): Promise<{ id: string; email: string } | null> {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!
      if (/auth-token$/.test(k)) {
        try {
          const u = JSON.parse(localStorage.getItem(k) || '{}').user
          return u ? { id: u.id as string, email: u.email as string } : null
        } catch { return null }
      }
    }
    return null
  })
}

/** Remove service worker e caches do PWA (uma tela "antiga" costuma ser cache). */
export async function limparPwa(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
    await Promise.all(regs.map(r => r.unregister()))
    const chaves = await caches.keys()
    await Promise.all(chaves.map(c => caches.delete(c)))
  })
}
