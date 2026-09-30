import * as fs from 'node:fs'
import { test as setup, expect } from '@playwright/test'
import { AUTH_DIR, EMAILS, PERFIS_LOGADOS, STORAGE_KEY, caminhoAuth, lerSenha } from '../../config'
import { clienteAutenticado } from '../../helpers/api'
import { garantirStaging } from '../../helpers/bundle'
import { limparDadosQA } from '../../helpers/limpeza'

// Se a trava falhar, os logins nem começam (modo serial).
setup.describe.configure({ mode: 'serial' })

setup('trava: o ambiente testado é o staging (nunca produção)', async () => {
  await garantirStaging()
})

for (const perfil of PERFIS_LOGADOS) {
  setup(`login: ${perfil}`, async ({ page }) => {
    const senha = lerSenha() // só de E2E_PASSWORD; nunca gravada nem impressa
    fs.mkdirSync(AUTH_DIR, { recursive: true })

    await page.goto('/login')
    await page.locator('input[type="email"]').fill(EMAILS[perfil])
    await page.locator('input[type="password"]').fill(senha)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()

    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30_000 })
    await page.waitForFunction(k => !!localStorage.getItem(k), STORAGE_KEY, { timeout: 15_000 })

    // Confirma quem entrou (sem imprimir token).
    const email = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').user?.email as string, STORAGE_KEY)
    expect(email, `usuário logado no perfil ${perfil}`).toBe(EMAILS[perfil])

    await page.context().storageState({ path: caminhoAuth(perfil) })
  })
}

setup('limpeza prévia: apaga resíduos QA- de rodadas anteriores', async () => {
  const admin = await clienteAutenticado('admin')
  const log = await limparDadosQA(admin)
  console.log('[limpeza prévia]\n  ' + log.join('\n  '))
})
