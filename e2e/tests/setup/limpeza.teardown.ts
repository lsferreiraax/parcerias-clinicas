import * as fs from 'node:fs'
import { test as teardown } from '@playwright/test'
import { caminhoAuth } from '../../config'
import { clienteAutenticado } from '../../helpers/api'
import { limparDadosQA } from '../../helpers/limpeza'

// Roda ao final de qualquer execução que tenha usado o projeto setup. O que só o admin consegue apagar
// (sessões, prontuários, pacientes, lançamentos) é apagado aqui com o token do admin, sempre filtrando por "QA-".
teardown('apagar dados sintéticos QA- criados pela suíte (perfil admin)', async () => {
  if (!fs.existsSync(caminhoAuth('admin'))) {
    console.log('[limpeza] sem sessão do admin: nada a limpar (o login não chegou a ocorrer).')
    return
  }
  const admin = await clienteAutenticado('admin')
  const log = await limparDadosQA(admin)
  console.log('[limpeza final]\n  ' + log.join('\n  '))
  if (log.some(l => l.includes('FALHOU') || /resíduos: .*=[1-9]/.test(l))) {
    throw new Error('Sobraram dados QA- no staging; veja o log acima e limpe manualmente (prefixo "QA-").')
  }
})
