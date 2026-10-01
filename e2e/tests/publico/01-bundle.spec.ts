import { test, expect } from '@playwright/test'
import { BASE_URL, PRODUCAO_REF, STAGING_REF, versaoEsperada } from '../../config'
import { baixarBundle, extrairAnonKey, payloadJwt, refsSupabase } from '../../helpers/bundle'

// Sem login. Confere o que está PUBLICADO em BASE_URL (alias fixo do staging).

test.describe('Bundle publicado do staging', () => {
  test('o alias do staging responde e serve o bundle principal', async () => {
    const b = await baixarBundle()
    expect(b.url).toContain('/assets/index-')
    expect(b.js.length).toBeGreaterThan(500_000)
  })

  test('o bundle aponta só para o Supabase de staging (nunca produção)', async () => {
    const { js } = await baixarBundle()
    expect(refsSupabase(js), 'projetos Supabase referenciados').toEqual([STAGING_REF])
    expect(js.includes(PRODUCAO_REF), 'referência ao projeto de produção').toBe(false)
  })

  test('traz a versão esperada do app', async () => {
    const versao = versaoEsperada()
    test.skip(!versao, 'versão esperada não definida (E2E_VERSAO_ESPERADA ou App/package.json)')
    const { js } = await baixarBundle()
    const re = new RegExp(`(?<![0-9.])${versao.replace(/\./g, '\\.')}(?![0-9.])`)
    expect(re.test(js), `versão ${versao} no bundle de ${BASE_URL}`).toBe(true)
  })

  test('não contém @staging.test no guard de rotas (whitelist/bypass removidos, DT1)', async () => {
    const { js } = await baixarBundle()
    expect(js.includes('@staging.test')).toBe(false)
  })

  test('não contém o embed antigo entre schemas pacientes(nome (DT7)', async () => {
    const { js } = await baixarBundle()
    expect(js.includes('pacientes(nome')).toBe(false)
    expect(js.includes('profissionais(nome')).toBe(false)
  })

  test('a chave embutida é a anon pública do projeto de staging', async () => {
    const { js } = await baixarBundle()
    const p = payloadJwt(extrairAnonKey(js))
    expect(p.role).toBe('anon')
    expect(p.ref).toBe(STAGING_REF)
  })
})
