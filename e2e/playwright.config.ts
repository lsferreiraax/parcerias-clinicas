import { defineConfig } from '@playwright/test'
import { BASE_URL, PERFIS_LOGADOS, caminhoAuth, travaStaging } from './config'

// Trava de segurança: aborta ANTES de qualquer teste se a configuração apontar para produção.
travaStaging()

const perfis = PERFIS_LOGADOS.map(perfil => ({
  name: perfil,
  testMatch: [`tests/${perfil}/**/*.spec.ts`, 'tests/transversal/**/*.spec.ts'],
  dependencies: ['setup'],
  use: { storageState: caminhoAuth(perfil), viewport: { width: 1366, height: 800 } },
}))

export default defineConfig({
  testDir: '.',
  // Sem corrida de dados: um teste por vez, na ordem dos arquivos (prefixos numéricos).
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
    // Evita a tela "antiga" do PWA: o service worker nem é registrado nos testes.
    serviceWorkers: 'block',
  },
  projects: [
    // Sem login: bundle publicado e API anônima.
    {
      name: 'publico',
      testMatch: 'tests/publico/**/*.spec.ts',
      use: { viewport: { width: 1366, height: 800 } },
    },
    // Trava dinâmica + login de cada perfil (precisa de E2E_PASSWORD) + limpeza prévia; o teardown apaga dados QA-.
    {
      name: 'setup',
      testMatch: 'tests/setup/auth.setup.ts',
      teardown: 'limpeza',
    },
    { name: 'limpeza', testMatch: 'tests/setup/limpeza.teardown.ts' },
    ...perfis,
    // Smoke responsivo em 375px (usa a sessão do admin).
    {
      name: 'mobile',
      testMatch: 'tests/mobile/**/*.spec.ts',
      dependencies: ['setup'],
      use: { storageState: caminhoAuth('admin'), viewport: { width: 375, height: 812 }, hasTouch: true },
    },
  ],
})
