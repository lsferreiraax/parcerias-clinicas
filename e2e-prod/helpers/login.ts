import * as fs from 'node:fs'
import { expect, Page } from '@playwright/test'
import { AUTH_DIR, PerfilId, STORAGE_KEY, caminhoAuth, credenciais } from '../config'

/**
 * Login pela tela (POST /auth/v1/token, na allowlist). Credenciais só do ambiente; nada é impresso.
 * Grava a sessão em .auth-prod/<perfil>.json (ignorado pelo git; o teardown apaga).
 */
export async function logarEGravar(page: Page, perfil: PerfilId): Promise<void> {
  const { email, senha } = credenciais(perfil)
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30_000 })
  await page.waitForFunction(k => !!localStorage.getItem(k), STORAGE_KEY, { timeout: 15_000 })

  // Confirma (sem imprimir) que quem entrou é o usuário das variáveis.
  const igual = await page.evaluate(([k, e]) => {
    const u = JSON.parse(localStorage.getItem(k) || '{}').user?.email as string | undefined
    return (u ?? '').toLowerCase() === e.toLowerCase()
  }, [STORAGE_KEY, email] as const)
  expect(igual, `usuário logado no perfil ${perfil} é o das variáveis de ambiente`).toBe(true)

  await page.context().storageState({ path: caminhoAuth(perfil) })
}

export function apagarSessao(perfil: PerfilId): void {
  fs.rmSync(caminhoAuth(perfil), { force: true })
}
