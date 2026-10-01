import { PREFIXO_QA } from '../config'
import type { ApiRest } from './api'

const RODADA = Date.now()

/** Nome sintético identificável: "QA-<rótulo>-<timestamp da rodada>". */
export function nomeQA(rotulo: string, sufixo = ''): string {
  return `${PREFIXO_QA}${rotulo}-${RODADA}${sufixo ? '-' + sufixo : ''}`
}

/** Cria um paciente sintético pela API (perfis com permissão) e devolve o id. */
export async function criarPacienteQA(api: ApiRest, rotulo = 'Paciente-API'): Promise<{ id: string; nome: string }> {
  const nome = nomeQA(rotulo, String(Math.floor(Math.random() * 1e4)))
  const r = await api.post('pacientes', { nome })
  if (!r.ok || !r.body?.[0]?.id) throw new Error(`Não foi possível criar paciente QA: HTTP ${r.status}`)
  return { id: r.body[0].id, nome }
}

/** Primeira sala ativa (id) lida pela API do admin. */
export async function primeiraSalaAtiva(api: ApiRest): Promise<{ id: string; nome: string }> {
  const r = await api.get('salas?select=id,nome&ativo=eq.true&order=nome&limit=1', 'psicologia')
  if (!r.ok || !r.body?.[0]) throw new Error(`Nenhuma sala ativa encontrada: HTTP ${r.status}`)
  return r.body[0]
}

/** Um profissional ativo diferente de `excetoId` (para agendar "para outro profissional"). */
export async function outroProfissional(api: ApiRest, excetoId: string): Promise<{ id: string; nome: string; tipo: string }> {
  const r = await api.get(`profissionais?select=id,nome,tipo&ativo=eq.true&id=neq.${excetoId}&order=nome&limit=1`)
  if (!r.ok || !r.body?.[0]) throw new Error(`Nenhum outro profissional encontrado: HTTP ${r.status}`)
  return r.body[0]
}
