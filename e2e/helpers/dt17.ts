import type { ApiRest } from './api'
import { PROFISSIONAL_ANA_ID } from '../config'
import { nomeQA } from './dados'
import { dataLocal } from './ui'

export type TipoCota = 'camta' | 'medico' | 'psi1' | 'psi2'
export const TIPOS: TipoCota[] = ['camta', 'medico', 'psi1', 'psi2']

export interface ProfissionalDT17 { id: string; nome: string; tipo: TipoCota; ativo: boolean }
export interface ParceriaDT17 { id: string; descricao: string; camta_pct: number; medico_pct: number; psi1_pct: number; psi2_pct: number }

/** Todos os profissionais (lidos com o token do admin). */
export async function listarProfissionais(admin: ApiRest): Promise<ProfissionalDT17[]> {
  const r = await admin.get('profissionais?select=id,nome,tipo,ativo&order=nome')
  if (!r.ok) throw new Error(`Não foi possível ler profissionais: HTTP ${r.status}`)
  return r.body.map((p: ProfissionalDT17) => ({ ...p, ativo: p.ativo !== false }))
}

export const ativosDoTipo = (todos: ProfissionalDT17[], tipo: TipoCota) => todos.filter(p => p.tipo === tipo && p.ativo)

/** Duas psi1 ativas: Ana (vinculada a profissional@) e outra (Fernanda no seed). */
export async function duasPsi1(admin: ApiRest): Promise<{ ana: ProfissionalDT17; outra: ProfissionalDT17 }> {
  const psi1 = ativosDoTipo(await listarProfissionais(admin), 'psi1')
  const ana = psi1.find(p => p.id === PROFISSIONAL_ANA_ID)
  const outra = psi1.find(p => p.id !== PROFISSIONAL_ANA_ID)
  if (!ana || !outra) throw new Error('O staging precisa ter 2 psi1 ativas (Ana Lima e outra) para os testes do DT17.')
  return { ana, outra }
}

export async function listarParcerias(admin: ApiRest): Promise<ParceriaDT17[]> {
  const r = await admin.get('parcerias?select=id,descricao,camta_pct,medico_pct,psi1_pct,psi2_pct&order=id')
  if (!r.ok) throw new Error(`Não foi possível ler parcerias: HTTP ${r.status}`)
  return r.body.map((p: ParceriaDT17) => ({
    ...p, camta_pct: Number(p.camta_pct), medico_pct: Number(p.medico_pct), psi1_pct: Number(p.psi1_pct), psi2_pct: Number(p.psi2_pct),
  }))
}

export const cotasPagas = (p: ParceriaDT17): TipoCota[] => TIPOS.filter(t => p[`${t}_pct`] > 0)

/** Parceria que paga o maior número de cotas (para o formulário mostrar o máximo de selects). */
export function parceriaComMaisCotas(ps: ParceriaDT17[]): ParceriaDT17 {
  return [...ps].sort((a, b) => cotasPagas(b).length - cotasPagas(a).length)[0]
}

export interface NovoLancQA {
  paciente: string
  parceria_id: string
  /** Valores por cota (default 0). */
  valores?: Partial<Record<TipoCota, number>>
  pessoas?: Partial<Record<TipoCota, string | null>>
  data?: string
  status?: 'pendente' | 'pago' | 'cancelado'
}

/** Insere lançamento QA- à vista direto pela API (sem parcelas) com cotas e pessoas explícitas. Devolve a linha. */
export async function inserirLancamentoQA(api: ApiRest, d: NovoLancQA) {
  const v = d.valores ?? {}
  const p = d.pessoas ?? {}
  const total = TIPOS.reduce((s, t) => s + (v[t] ?? 0), 0) || 1
  const r = await api.post('lancamentos', {
    data_atendimento: d.data ?? dataLocal(-3),
    paciente: d.paciente,
    parceria_id: d.parceria_id,
    forma_pagamento: 'avista',
    num_parcelas: 1,
    valor_total: total,
    camta_valor: v.camta ?? 0, medico_valor: v.medico ?? 0, psi1_valor: v.psi1 ?? 0, psi2_valor: v.psi2 ?? 0,
    camta_profissional_id: p.camta ?? null, medico_profissional_id: p.medico ?? null,
    psi1_profissional_id: p.psi1 ?? null, psi2_profissional_id: p.psi2 ?? null,
    status: d.status ?? 'pendente',
  })
  if (!r.ok || !r.body?.[0]?.id) throw new Error(`Não foi possível criar lançamento QA: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`)
  return r.body[0] as { id: string; paciente: string }
}

export const nomeLanc = (rotulo: string, sufixo = '') => nomeQA(`DT17-${rotulo}`, sufixo)

/** Primeiro dia do mês de 11 meses atrás (mesma janela do front). */
export function desdeDozeMeses(): string {
  const d = new Date(); d.setMonth(d.getMonth() - 11); d.setDate(1)
  return d.toISOString().slice(0, 10)
}
