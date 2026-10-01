import { PREFIXO_QA } from '../config'
import type { ApiRest } from './api'
import { desativarUsuariosQA } from './usuarios'

/**
 * Apaga dados sintéticos criados pela suíte (TUDO filtrado por prefixo "QA-"; nunca um DELETE sem filtro).
 * Precisa do token do ADMIN (só ele apaga sessões, prontuários e pacientes por RLS).
 * Devolve um relatório textual; falhas de remoção não derrubam a execução, mas ficam listadas.
 */
/** Repete a chamada de rede até 3 vezes (backoff 1s, 2s); falhas de rede (fetch failed) viram resposta status 0. */
async function comRetry(fn: () => Promise<{ status: number; body: unknown }>): Promise<{ status: number; body: unknown }> {
  let ultimo: { status: number; body: unknown } = { status: 0, body: 'sem resposta' }
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fn()
      if (r.status !== 0 && r.status < 500) return r
      ultimo = r
    } catch (e) {
      ultimo = { status: 0, body: `erro de rede: ${(e as Error).message}${(e as Error).cause ? ' / ' + String((e as Error).cause) : ''}` }
    }
    await new Promise(res => setTimeout(res, 1000 * (i + 1)))
  }
  return ultimo
}

export async function limparDadosQA(admin: ApiRest): Promise<string[]> {
  const log: string[] = []
  const padrao = `like.${PREFIXO_QA}*`
  const linhas = (r: { body: unknown }) => (Array.isArray(r.body) ? r.body.length : 0)

  const pac = await comRetry(() => admin.get(`pacientes?select=id&nome=${padrao}`))
  const idsPac: string[] = Array.isArray(pac.body) ? pac.body.map((p: { id: string }) => p.id) : []

  const passos: [string, () => Promise<{ status: number; body: unknown }>][] = [
    ['prontuarios (queixa QA-)', () => admin.delete(`prontuarios?queixa_principal=${padrao}`, 'psicologia')],
    ['sessoes (observacoes QA-)', () => admin.delete(`sessoes?observacoes=${padrao}`, 'psicologia')],
  ]
  if (idsPac.length) {
    const lista = `in.(${idsPac.join(',')})`
    passos.push(['prontuarios (pacientes QA-)', () => admin.delete(`prontuarios?paciente_id=${lista}`, 'psicologia')])
    passos.push(['sessoes (pacientes QA-)', () => admin.delete(`sessoes?paciente_id=${lista}`, 'psicologia')])
    passos.push(['pacientes QA-', () => admin.delete(`pacientes?id=${lista}`)])
  }
  // lancamentos: parcelas, repasses e logs saem em cascata
  passos.push(['lancamentos QA- (parcelas/repasses em cascata)', () => admin.delete(`lancamentos?paciente=${padrao}`)])

  for (const [nome, fn] of passos) {
    const r = await comRetry(fn)
    log.push(r.status >= 200 && r.status < 300 ? `${nome}: ${linhas(r)} removido(s)` : `${nome}: FALHOU (HTTP ${r.status}) ${JSON.stringify(r.body).slice(0, 160)}`)
  }

  // Resíduos
  const res = await comRetry(() => admin.get(`lancamentos?select=id&paciente=${padrao}`))
  const resP = await comRetry(() => admin.get(`pacientes?select=id&nome=${padrao}`))
  if (res.status === 200 && resP.status === 200) log.push(`resíduos: lancamentos=${linhas(res)} pacientes=${linhas(resP)}`)
  else log.push(`resíduos: NÃO VERIFICADOS (HTTP ${res.status}/${resP.status}); confira no staging o prefixo "${PREFIXO_QA}"`)
  // DT16: usuários de teste (qa-dt16-*) são desativados (ativo=false); apagar de auth.users exige service role.
  log.push(await desativarUsuariosQA(admin))
  return log
}
