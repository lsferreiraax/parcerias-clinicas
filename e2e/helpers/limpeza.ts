import { PREFIXO_QA } from '../config'
import type { ApiRest } from './api'

/**
 * Apaga dados sintéticos criados pela suíte (TUDO filtrado por prefixo "QA-"; nunca um DELETE sem filtro).
 * Precisa do token do ADMIN (só ele apaga sessões, prontuários e pacientes por RLS).
 * Devolve um relatório textual; falhas de remoção não derrubam a execução, mas ficam listadas.
 */
export async function limparDadosQA(admin: ApiRest): Promise<string[]> {
  const log: string[] = []
  const padrao = `like.${PREFIXO_QA}*`
  const linhas = (r: { body: unknown }) => (Array.isArray(r.body) ? r.body.length : 0)

  const pac = await admin.get(`pacientes?select=id&nome=${padrao}`)
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
    const r = await fn()
    log.push(r.status >= 200 && r.status < 300 ? `${nome}: ${linhas(r)} removido(s)` : `${nome}: FALHOU (HTTP ${r.status}) ${JSON.stringify(r.body).slice(0, 160)}`)
  }

  // Resíduos
  const res = await admin.get(`lancamentos?select=id&paciente=${padrao}`)
  const resP = await admin.get(`pacientes?select=id&nome=${padrao}`)
  log.push(`resíduos: lancamentos=${linhas(res)} pacientes=${linhas(resP)}`)
  return log
}
