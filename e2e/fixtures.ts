import { test as base, expect } from '@playwright/test'
import { PERFIS_LOGADOS, PerfilId } from './config'
import { ApiRest, clienteAutenticado } from './helpers/api'
import { ColetorErros } from './helpers/coletor'
import { PERFIS, PerfilE2E } from './helpers/rotas'
import { lerSessao } from './helpers/sessao'

interface Fixtures {
  /** Coletor de respostas de API >= 400 e erros de console da página do teste. */
  coletor: ColetorErros
  /** Definição (rotas esperadas) do perfil do projeto em execução. */
  perfil: PerfilE2E
  /** Cliente REST autenticado como o perfil do projeto. */
  api: ApiRest
  /** Cliente REST autenticado como admin (preparação/limpeza de dados QA-). */
  apiAdmin: ApiRest
  /** Id (auth.users) do usuário do perfil do projeto. */
  meuId: string
}

export const test = base.extend<Fixtures>({
  coletor: async ({ page }, use) => { await use(new ColetorErros(page)) },
  perfil: async ({}, use, testInfo) => {
    const id = testInfo.project.name as PerfilId
    if (!PERFIS_LOGADOS.includes(id)) throw new Error(`Projeto "${id}" não é um perfil logado`)
    await use(PERFIS[id])
  },
  api: async ({ perfil }, use) => { await use(await clienteAutenticado(perfil.id)) },
  apiAdmin: async ({}, use) => { await use(await clienteAutenticado('admin')) },
  meuId: async ({ perfil }, use) => { await use(lerSessao(perfil.id).userId) },
})

export { expect }
