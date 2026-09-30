import { test, expect } from '../../fixtures'
import { BASE_URL, PRODUCAO_REF, STAGING_REF, versaoEsperada } from '../../config'
import { baixarBundle, extrairAnonKey, garantirProducao, payloadJwt, refsSupabase } from '../../helpers/bundle'

// Sem login. Só GET externo em BASE_URL. Mensagens: contagens e booleanos, nunca trechos do bundle.

test.describe('Produção: serviço e bundle publicado', () => {
  test('trava dinâmica + serviço responde 200 e serve o bundle principal', async () => {
    await garantirProducao()
    const b = await baixarBundle()
    expect(b.status, 'status de GET /').toBe(200)
    expect(b.url).toContain('/assets/index-')
    expect(b.js.length, 'tamanho do bundle (bytes)').toBeGreaterThan(500_000)
  })

  test('o bundle aponta só para o Supabase de produção (0 ocorrência do ref de staging)', async () => {
    const { js } = await baixarBundle()
    expect(refsSupabase(js), 'projetos Supabase referenciados').toEqual([PRODUCAO_REF])
    expect(js.split(STAGING_REF).length - 1, 'ocorrências do ref de staging').toBe(0)
  })

  test('traz a versão esperada do app', async () => {
    const versao = versaoEsperada()
    test.skip(!versao, 'versão esperada não definida (PROD_VERSAO_ESPERADA ou App/package.json)')
    const { js } = await baixarBundle()
    const re = new RegExp(`(?<![0-9.])${versao.replace(/\./g, '\\.')}(?![0-9.])`)
    expect(re.test(js), `versão esperada ${versao} presente no bundle de ${BASE_URL}`).toBe(true)
  })

  test('não contém @staging.test (whitelist/bypass de teste ausentes)', async () => {
    const { js } = await baixarBundle()
    expect(js.includes('@staging.test')).toBe(false)
  })

  test('a chave embutida é a anon pública do projeto de produção', async () => {
    const { js } = await baixarBundle()
    const p = payloadJwt(extrairAnonKey(js))
    expect(p.role).toBe('anon')
    expect(p.ref).toBe(PRODUCAO_REF)
  })

  test('cabeçalhos básicos: HTTPS, HSTS e sem x-powered-by', async () => {
    const r = await fetch(`${BASE_URL}/`, { redirect: 'follow' })
    expect(new URL(r.url).protocol, 'protocolo final').toBe('https:')
    expect(r.headers.get('x-powered-by'), 'x-powered-by deve estar ausente').toBeNull()
    expect(r.headers.get('strict-transport-security') ?? '', 'HSTS presente').toMatch(/max-age=\d+/)
  })
})
