import { supabase } from '@/lib/supabase'
import type { Repasse, RepasseLog, TipoRepasse, StatusRepasse } from '@/types'

export interface FiltroRepasse {
  tipo?: TipoRepasse
  status?: StatusRepasse
  paciente?: string
  dataInicio?: string
  dataFim?: string
  dataRepasseInicio?: string
  dataRepasseFim?: string
}

export async function listarRepasses(filtro?: FiltroRepasse): Promise<Repasse[]> {
  let q = supabase
    .from('repasses')
    .select('*, lancamentos(data_atendimento, paciente, parceria_id, data_pagamento)')
    .order('created_at', { ascending: false })

  if (filtro?.tipo)   q = q.eq('tipo', filtro.tipo)
  if (filtro?.status) q = q.eq('status', filtro.status)
  if (filtro?.dataRepasseInicio) q = q.gte('data_repasse', filtro.dataRepasseInicio)
  if (filtro?.dataRepasseFim)    q = q.lte('data_repasse', filtro.dataRepasseFim)

  const { data, error } = await q
  if (error) throw error

  let result = (data ?? []) as Repasse[]

  // Filtros em campos da tabela relacionada (lancamentos) feitos no cliente
  // pois o Supabase PostgREST não suporta filtrar em colunas de joins embutidos
  if (filtro?.dataInicio) {
    result = result.filter(r => (r.lancamentos?.data_atendimento ?? '') >= filtro.dataInicio!)
  }
  if (filtro?.dataFim) {
    result = result.filter(r => (r.lancamentos?.data_atendimento ?? '') <= filtro.dataFim!)
  }
  if (filtro?.paciente) {
    const termo = filtro.paciente.toLowerCase()
    result = result.filter(r =>
      r.lancamentos?.paciente?.toLowerCase().includes(termo)
    )
  }

  return result
}

export async function editarValorRepasse(
  id: string,
  novoValor: number,
  motivo: string
): Promise<void> {
  const { data: atual, error: errBusca } = await supabase
    .from('repasses').select('valor_repasse').eq('id', id).single()
  if (errBusca) throw errBusca

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('repasses').update({ valor_repasse: novoValor }).eq('id', id)
  if (error) throw error

  await supabase.from('repasses_log').insert({
    repasse_id:     id,
    campo:          'valor_repasse',
    valor_anterior: String(atual.valor_repasse),
    valor_novo:     String(novoValor),
    motivo,
    alterado_por:   user?.id ?? null,
  })
}

export async function conciliarRepasse(id: string, dataRepasse: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('repasses')
    .update({ status: 'conciliado', data_repasse: dataRepasse })
    .eq('id', id)
  if (error) throw error

  await supabase.from('repasses_log').insert({
    repasse_id:     id,
    campo:          'status',
    valor_anterior: 'nao_conciliado',
    valor_novo:     'conciliado',
    motivo:         `Conciliado em ${dataRepasse}`,
    alterado_por:   user?.id ?? null,
  })
}

export async function desconciliarRepasse(id: string, motivo: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('repasses')
    .update({ status: 'nao_conciliado', data_repasse: null })
    .eq('id', id)
  if (error) throw error

  await supabase.from('repasses_log').insert({
    repasse_id:     id,
    campo:          'status',
    valor_anterior: 'conciliado',
    valor_novo:     'nao_conciliado',
    motivo,
    alterado_por:   user?.id ?? null,
  })
}

export async function conciliarEmLote(ids: string[], dataRepasse: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('repasses')
    .update({ status: 'conciliado', data_repasse: dataRepasse })
    .in('id', ids)
  if (error) throw error

  const logs = ids.map(id => ({
    repasse_id:     id,
    campo:          'status',
    valor_anterior: 'nao_conciliado',
    valor_novo:     'conciliado',
    motivo:         `Conciliação em lote — data: ${dataRepasse}`,
    alterado_por:   user?.id ?? null,
  }))
  await supabase.from('repasses_log').insert(logs)
}

export async function contarRepassesPendentes(): Promise<number> {
  const { count, error } = await supabase
    .from('repasses')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'nao_conciliado')
  if (error) throw error
  return count ?? 0
}

export async function buscarRepassesAntigos(): Promise<{ count: number; tipos: string[] }> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('repasses')
    .select('tipo, lancamentos(data_atendimento)')
    .eq('status', 'nao_conciliado')
  if (error) throw error

  const antigos = (data ?? []).filter(r => {
    const lancamento = Array.isArray(r.lancamentos) ? r.lancamentos[0] : r.lancamentos
    return lancamento?.data_atendimento && lancamento.data_atendimento < cutoffStr
  })
  const tipos = [...new Set(antigos.map(r => r.tipo as string))]
  return { count: antigos.length, tipos }
}

export async function buscarLogRepasse(repasseId: string): Promise<RepasseLog[]> {
  const { data, error } = await supabase
    .from('repasses_log')
    .select('*')
    .eq('repasse_id', repasseId)
    .order('alterado_em', { ascending: false })
  if (error) throw error
  return data as RepasseLog[]
}
