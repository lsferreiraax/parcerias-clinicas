import { test as base, expect } from '@playwright/test'
import { GuardaEscrita, instalarGuarda } from './helpers/somente-leitura'

/**
 * `test` do smoke de produção: TODO teste roda com o guarda de somente leitura instalado no contexto
 * (fixture automática) e falha no fim se alguma escrita fora da allowlist foi tentada.
 */
export const test = base.extend<{ guarda: GuardaEscrita }>({
  guarda: [async ({ context }, use) => {
    const g = await instalarGuarda(context)
    await use(g)
    expect(g.violacoes, g.mensagem()).toEqual([])
  }, { auto: true }],
})

export { expect }
