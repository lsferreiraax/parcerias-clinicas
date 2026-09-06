import { supabase } from '@/lib/supabase'
import type { ResumoParceria, ResumoProfissional } from '@/types'

export interface FiltroResumo {
  dataInicio?: string
  dataFim?: string
}

export async function getResumoPorParceria(filtro?: FiltroResumo): Promise<ResumoParceria[]> {
  if (!filtro?.dataInicio && !filtro?.dataFim) {
    const { data, error } = await supabase.from('resumo_por_parceria').select('*')
    if (error) throw error
    return data as ResumoParceria[]
  }

  let q = supabase
    .from('lancamentos')
    .select('parceria_id, valor_total, camta_valor, medico_valor, psi1_valor, psi2_valor, parcerias(descricao)')

  if (filtro.dataInicio) q = q.gte('data_atendimento', filtro.dataInicio)
  if (filtro.dataFim)    q = q.lte('data_atendimento', filtro.dataFim)

  const { data, error } = await q
  if (error) throw error

  const mapa: Record<string, ResumoParceria> = {}
  for (const l of data ?? []) {
    const pid = l.parceria_id as string
    if (!mapa[pid]) {
      mapa[pid] = {
        parceria:           pid as ResumoParceria['parceria'],
        descricao:          (l.parcerias as unknown as { descricao: string })?.descricao ?? pid,
        total_atendimentos: 0,
        valor_total:        0,
        camta_total:        0,
        medico_total:       0,
        psi1_total:         0,
        psi2_total:         0,
      }
    }
    mapa[pid].total_atendimentos += 1
    mapa[pid].valor_total        += Number(l.valor_total)
    mapa[pid].camta_total        += Number(l.camta_valor)
    mapa[pid].medico_total       += Number(l.medico_valor)
    mapa[pid].psi1_total         += Number(l.psi1_valor)
    mapa[pid].psi2_total         += Number(l.psi2_valor)
  }

  return Object.values(mapa).sort((a, b) => a.parceria.localeCompare(b.parceria))
}

export async function getResumoProfissional(filtro?: FiltroResumo): Promise<ResumoProfissional[]> {
  if (!filtro?.dataInicio && !filtro?.dataFim) {
    const { data, error } = await supabase.from('resumo_profissional').select('*')
    if (error) throw error
    return data as ResumoProfissional[]
  }

  let q = supabase
    .from('lancamentos')
    .select('camta_valor, medico_valor, psi1_valor, psi2_valor')

  if (filtro.dataInicio) q = q.gte('data_atendimento', filtro.dataInicio)
  if (filtro.dataFim)    q = q.lte('data_atendimento', filtro.dataFim)

  const { data, error } = await q
  if (error) throw error

  const totais = { camta: 0, medico: 0, psi1: 0, psi2: 0 }
  for (const l of data ?? []) {
    totais.camta  += Number(l.camta_valor)
    totais.medico += Number(l.medico_valor)
    totais.psi1   += Number(l.psi1_valor)
    totais.psi2   += Number(l.psi2_valor)
  }

  return Object.entries(totais).map(([profissional, total]) => ({ profissional, total }))
}

export async function getKPIs() {
  const [lanc, parc] = await Promise.all([
    supabase.from('lancamentos').select('valor_total, status'),
    supabase.from('parcelas').select('valor_parcela, status, data_vencimento'),
  ])

  const lancamentos = lanc.data ?? []
  const parcelas    = parc.data ?? []
  const hoje        = new Date().toISOString().split('T')[0]

  return {
    totalAtendimentos: lancamentos.length,
    receitaTotal: lancamentos.reduce((s, l) => s + Number(l.valor_total), 0),
    receitaPaga:  lancamentos.filter(l => l.status === 'pago').reduce((s, l) => s + Number(l.valor_total), 0),
    parcelasVencidas: parcelas.filter(p => p.status === 'pendente' && p.data_vencimento < hoje).length,
    parcelasPendentes: parcelas.filter(p => p.status === 'pendente').length,
  }
}
