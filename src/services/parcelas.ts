import { supabase } from '@/lib/supabase'
import type { Parcela, ParcelaLog } from '@/types'

export async function listarParcelas(filtros?: {
  lancamentoId?: string
  status?: string
  dataInicio?: string
  dataFim?: string
  paciente?: string
}) {
  let q = supabase
    .from('parcelas')
    .select('*, lancamentos(paciente, parceria_id)')
    .order('data_vencimento', { ascending: true })

  if (filtros?.lancamentoId) q = q.eq('lancamento_id', filtros.lancamentoId)
  if (filtros?.status)       q = q.eq('status', filtros.status)
  if (filtros?.dataInicio)   q = q.gte('data_vencimento', filtros.dataInicio)
  if (filtros?.dataFim)      q = q.lte('data_vencimento', filtros.dataFim)

  const { data, error } = await q
  if (error) throw error

  let result = data as (Parcela & { lancamentos: { paciente: string; parceria_id: string } })[]

  // Filtro de paciente client-side (campo de tabela relacionada)
  if (filtros?.paciente) {
    const termo = filtros.paciente.toLowerCase()
    result = result.filter(p => p.lancamentos?.paciente?.toLowerCase().includes(termo))
  }

  return result
}

export async function marcarParcelaPaga(id: string) {
  const hoje = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('parcelas')
    .update({ status: 'pago', data_pagamento: hoje })
    .eq('id', id)
  if (error) throw error
}

export async function atualizarStatusParcela(id: string, status: string, dataPagamento?: string) {
  const { error } = await supabase
    .from('parcelas')
    .update({ status, ...(dataPagamento ? { data_pagamento: dataPagamento } : {}) })
    .eq('id', id)
  if (error) throw error
}

export async function baixarEmLote(ids: string[]) {
  const hoje = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('parcelas')
    .update({ status: 'pago', data_pagamento: hoje })
    .in('id', ids)
  if (error) throw error
}

export async function renegociarParcela(id: string, novaData: string, observacoes: string) {
  const { error } = await supabase
    .from('parcelas')
    .update({ status: 'renegociada', data_vencimento: novaData, observacoes })
    .eq('id', id)
  if (error) throw error
}

export async function buscarHistorico(parcelaId: string): Promise<ParcelaLog[]> {
  const { data, error } = await supabase
    .from('parcelas_log')
    .select('*, user_profiles(nome)')
    .eq('parcela_id', parcelaId)
    .order('alterado_em', { ascending: false })
  if (error) throw error
  return data as ParcelaLog[]
}

export interface ParcelaRenegociada {
  id: string
  parcela_num: number
  parcela_total: number
  data_vencimento: string
  valor_parcela: number
  observacoes: string | null
  data_renegociacao: string | null
  paciente: string
  parceria_id: string
}

export async function listarRenegociadas(): Promise<ParcelaRenegociada[]> {
  const [{ data: parcelas, error: e1 }, { data: logs, error: e2 }] = await Promise.all([
    supabase
      .from('parcelas')
      .select('id, parcela_num, parcela_total, data_vencimento, valor_parcela, observacoes, lancamentos(paciente, parceria_id)')
      .eq('status', 'renegociada')
      .order('data_vencimento', { ascending: false }),
    supabase
      .from('parcelas_log')
      .select('parcela_id, alterado_em')
      .eq('campo_alterado', 'status')
      .eq('valor_novo', 'renegociada')
      .order('alterado_em', { ascending: false }),
  ])
  if (e1) throw e1
  if (e2) throw e2

  // Mapa parcela_id → data mais recente de renegociação
  const dataMap = new Map<string, string>()
  for (const log of logs ?? []) {
    if (!dataMap.has(log.parcela_id)) dataMap.set(log.parcela_id, log.alterado_em)
  }

  return (parcelas ?? []).map(p => ({
    id:                p.id,
    parcela_num:       p.parcela_num,
    parcela_total:     p.parcela_total,
    data_vencimento:   p.data_vencimento,
    valor_parcela:     Number(p.valor_parcela),
    observacoes:       p.observacoes ?? null,
    data_renegociacao: dataMap.get(p.id) ?? null,
    paciente:          (p.lancamentos as any)?.paciente ?? '—',
    parceria_id:       (p.lancamentos as any)?.parceria_id ?? '—',
  }))
}

export async function cancelarParcela(id: string, motivo: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: parcela, error: e0 } = await supabase
    .from('parcelas')
    .select('status')
    .eq('id', id)
    .single()
  if (e0) throw e0

  const { error } = await supabase
    .from('parcelas')
    .update({ status: 'cancelado' })
    .eq('id', id)
  if (error) throw error

  await supabase.from('parcelas_log').insert({
    parcela_id:     id,
    campo_alterado: 'status',
    valor_anterior: parcela?.status ?? 'pendente',
    valor_novo:     'cancelado',
    observacoes:    motivo,
    alterado_por:   user?.id ?? null,
  })
}

export async function contarParcelasAlerta(): Promise<number> {
  const hoje  = new Date().toISOString().split('T')[0]
  const amanha = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
  const { count, error } = await supabase
    .from('parcelas')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pendente')
    .lte('data_vencimento', amanha)
    .gte('data_vencimento', hoje)
  if (error) throw error
  return count ?? 0
}
