import * as fs from 'node:fs'
import { test as teardown } from '@playwright/test'
import { caminhoAuth } from '../../config'
import { clienteAutenticado } from '../../helpers/api'
import { limparDadosQA } from '../../helpers/limpeza'

// Roda ao final de qualquer execução que tenha usado o projeto setup. O que só o admin consegue apagar
// (sessões, prontuários, pacientes, lançamentos) é apagado aqui com o token do admin, sempre filtrando por "QA-".
// Falha de REDE (fetch failed) não derruba a suíte: a chamada é repetida 3x e, se persistir, vira AVISO com os
// resíduos possíveis. Só falha o teardown se o Supabase respondeu erro ou se sobraram dados QA- confirmados.
teardown('apagar dados sintéticos QA- criados pela suíte (perfil admin)', async () => {
  if (!fs.existsSync(caminhoAuth('admin'))) {
    console.log('[limpeza] sem sessão do admin: nada a limpar (o login não chegou a ocorrer).')
    return
  }
  let log: string[]
  try {
    const admin = await clienteAutenticado('admin')
    log = await limparDadosQA(admin)
  } catch (e) {
    const msg = `[limpeza] AVISO: não foi possível executar a limpeza (${(e as Error).message}). Podem restar dados "QA-" no staging ` +
      '(lançamentos/parcelas/repasses, pacientes, sessões, prontuários). Rode de novo a suíte ou limpe manualmente pelo prefixo "QA-".'
    console.warn(msg)
    teardown.info().annotations.push({ type: 'aviso', description: msg })
    return
  }
  console.log('[limpeza final]\n  ' + log.join('\n  '))
  const rede = log.filter(l => l.includes('FALHOU (HTTP 0)') || l.includes('NÃO VERIFICADOS (HTTP 0'))
  const falhas = log.filter(l => (l.includes('FALHOU') && !l.includes('FALHOU (HTTP 0)')) || /resíduos: .*=[1-9]/.test(l))
  if (rede.length) {
    const msg = `[limpeza] AVISO: falha de rede persistente após 3 tentativas; resíduos "QA-" possíveis:\n  ${rede.join('\n  ')}`
    console.warn(msg)
    teardown.info().annotations.push({ type: 'aviso', description: msg })
  }
  if (falhas.length) {
    throw new Error('Sobraram dados QA- no staging; veja o log acima e limpe manualmente (prefixo "QA-").')
  }
})
