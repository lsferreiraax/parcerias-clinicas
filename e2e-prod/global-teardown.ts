import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * LGPD: em caso de falha o Playwright grava `test-results/**\/error-context.md` com o "Page snapshot" (árvore de
 * acessibilidade = texto da tela de produção). Não há opção de configuração para desligar; por isso, ao fim de
 * TODA rodada apagamos a pasta (e ela também é ignorada pelo git).
 */
export default async function globalTeardown(): Promise<void> {
  fs.rmSync(path.join(__dirname, 'test-results'), { recursive: true, force: true })
}
