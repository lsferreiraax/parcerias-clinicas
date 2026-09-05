import { supabase } from '@/lib/supabase'
import type { Parcela } from '@/types'

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
