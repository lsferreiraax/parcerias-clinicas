import { supabase } from '@/lib/supabase'
import type { Parcela, ParcelaLog } from '@/types'

export async function listarParcelas(filtros?: {
  lancamentoId?: string
  status?: string
  dataInicio?: string
  dataFim?: string
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
  return data as (Parcela & { lancamentos: { paciente: string; parceria_id: string } })[]
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
