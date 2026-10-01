import { defineConfig } from '@playwright/test'
import { BASE_URL, caminhoAuth, financeiroConfigurado, travaProducao } from './config'

// Trava inversa: só roda contra PRODUÇÃO e com PROD_SMOKE_CONFIRMA=sim. Aborta antes de qualquer teste.
travaProducao()

const projetos = [
  // Sem login: somente leituras anônimas externas.
  { name: 'prod-publico', testMatch: 'tests/publico/**/*.spec.ts', use: { viewport: { width: 1366, height: 800 } } },

  // Admin: login (setup) -> testes de leitura -> teardown apaga a sessão gravada.
  { name: 'setup-admin', testMatch: 'tests/setup/login-admin.setup.ts', teardown: 'limpa-sessao-admin' },
  { name: 'limpa-sessao-admin', testMatch: 'tests/setup/limpa-admin.teardown.ts' },
  {
    name: 'prod-admin',
    testMatch: 'tests/admin/**/*.spec.ts',
    dependencies: ['setup-admin'],
    use: { storageState: caminhoAuth('admin'), viewport: { width: 1366, height: 800 } },
  },
]

// Financeiro: opcional, só se PROD_SMOKE_EMAIL_FIN e PROD_SMOKE_PASSWORD_FIN estiverem definidos.
if (financeiroConfigurado()) {
  projetos.push(
    { name: 'setup-financeiro', testMatch: 'tests/setup/login-financeiro.setup.ts', teardown: 'limpa-sessao-financeiro' } as any,
    { name: 'limpa-sessao-financeiro', testMatch: 'tests/setup/limpa-financeiro.teardown.ts' } as any,
    {
      name: 'prod-financeiro',
      testMatch: 'tests/financeiro/**/*.spec.ts',
      dependencies: ['setup-financeiro'],
      use: { storageState: caminhoAuth('financeiro'), viewport: { width: 1366, height: 800 } },
    } as any,
  )
}

export default defineConfig({
  testDir: '.',
  globalTeardown: './global-teardown.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0, // sem retries: não há escrita a repetir e uma falha de produção deve ser vista, não mascarada
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // LGPD: relatório só no terminal. Sem HTML (guardaria DOM/texto de páginas reais).
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // LGPD: nenhum artefato que capture a tela ou o DOM de produção.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    acceptDownloads: true,
    serviceWorkers: 'block',
  },
  projects: projetos,
})
