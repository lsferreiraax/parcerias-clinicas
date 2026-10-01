import { test, expect } from '../../fixtures'
import { psicologiaExposta } from '../../config'
import { clienteAutenticado, descrever, semDados } from '../../helpers/api'
import { ColetorErros } from '../../helpers/coletor'
import { FINANCEIRAS } from '../../helpers/rotas'
import { abrirRota, hrefsDoMenu, uuidsNoMain } from '../../helpers/ui'

/**
 * SMOKE DO FINANCEIRO (role gestor) EM PRODUÇÃO: somente leitura. Só roda se PROD_SMOKE_EMAIL_FIN/PASSWORD_FIN existirem.
 */

const PSICOLOGIA_BLOQUEADA = ['/agenda', '/pacientes', '/dashboard-psicologia', '/grade-salas']
const SO_ADMIN = ['/salas', '/condominio', '/usuarios', '/perfis', '/configuracoes']

test.describe('Produção: smoke do financeiro', () => {
  test('rotas financeiras abrem, sem UUID e sem resposta de API >= 400; menu == 9 telas', async ({ page }) => {
    const coletor = new ColetorErros(page)
    await page.goto('/')
    for (const rota of FINANCEIRAS) {
      coletor.limpar()
      const destino = await abrirRota(page, rota)
      expect.soft(destino, `rota ${rota} deveria abrir`).toBe(rota)
      expect.soft(await uuidsNoMain(page), `UUIDs visíveis em ${rota}`).toBe(0)
      expect.soft(coletor.apiErros, `respostas de API >= 400 em ${rota}`).toEqual([])
    }
    const menu = await hrefsDoMenu(page)
    expect([...menu].sort(), 'menu do financeiro').toEqual([...FINANCEIRAS].sort())
  })

  test('Psicologia/Pacientes/Grade bloqueadas (/sem-acesso)', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/')
    for (const rota of PSICOLOGIA_BLOQUEADA) {
      expect.soft(await abrirRota(page, rota), `${rota} deve ir a /sem-acesso`).toBe('/sem-acesso')
    }
  })

  test('rotas só de admin não permanecem abertas', async ({ page }) => {
    await page.goto('/')
    await abrirRota(page, '/')
    for (const rota of SO_ADMIN) {
      const destino = await abrirRota(page, rota)
      expect.soft(['/', '/sem-acesso'], `${rota} terminou em ${destino}`).toContain(destino)
    }
  })

  test('RLS pela API com o token do financeiro: psicologia.* e pacientes retornam 0 linhas', async () => {
    const api = await clienteAutenticado('financeiro')
    const exposta = psicologiaExposta()
    for (const t of ['sessoes', 'salas', 'prontuarios', 'bloqueios_sala', 'contratos_sala', 'despesas_condominio', 'demonstrativos_condominio']) {
      const r = await api.get(`${t}?select=*&limit=1`, 'psicologia')
      expect.soft(semDados(r, !exposta), `psicologia.${t}: ${descrever(r)}`).toBe(true)
    }
    const p = await api.get('pacientes?select=*&limit=1')
    expect.soft(semDados(p), `public.pacientes: ${descrever(p)}`).toBe(true)
  })
})
