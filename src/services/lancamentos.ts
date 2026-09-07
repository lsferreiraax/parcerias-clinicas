import { supabase } from '@/lib/supabase'
import { calcularRateio } from './rateio'
import type { Lancamento, ParceriaId, FormaPagamento } from '@/types'

export interface NovoLancamento {
  data_atendimento: string
  paciente: string
  nome_responsavel?: string
  data_pagamento?: string
  meio_pagamento?: string[]
  parceria_id: ParceriaId
  forma_pagamento: FormaPagamento
  num_parcelas: number
  valor_total: number
  observacoes?: string
}

export async function criarLancamento(dados: NovoLancamento) {
  const rateio = calcularRateio(dados.parceria_id, dados.valor_total)

  const { data, error } = await supabase
    .from('lancamentos')
    .insert({ ...dados, ...rateio })
    .select()
    .single()

  if (error) throw error

  // Se parcelado, cria as parcelas automaticamente
  if (dados.forma_pagamento === 'parcelado' && dados.num_parcelas > 1) {
    const valorParcela = Math.round((dados.valor_total / dados.num_parcelas) * 100) / 100
    const rateioParc = calcularRateio(dados.parceria_id, valorParcela)
    const hoje = new Date(dados.data_atendimento)

    const parcelas = Array.from({ length: dados.num_parcelas }, (_, i) => {
      const venc = new Date(hoje)
      venc.setMonth(venc.getMonth() + i)
      return {
        lancamento_id: data.id,
        parcela_num: i + 1,
        parcela_total: dados.num_parcelas,
        data_vencimento: venc.toISOString().split('T')[0],
        valor_parcela: valorParcela,
        ...rateioParc,
      }
    })

    const { error: errParc } = await supabase.from('parcelas').insert(parcelas)
    if (errParc) throw errParc
  }

  return data
}

export async function listarLancamentos(filtros?: {
  parceria?: string
  status?: string
  dataInicio?: string
  dataFim?: string
}) {
  let q = supabase
    .from('lancamentos')
    .select('*, parcelas(*)')
    .order('data_atendimento', { ascending: false })

  if (filtros?.parceria)   q = q.eq('parceria_id', filtros.parceria)
  if (filtros?.status)     q = q.eq('status', filtros.status)
  if (filtros?.dataInicio) q = q.gte('data_atendimento', filtros.dataInicio)
  if (filtros?.dataFim)    q = q.lte('data_atendimento', filtros.dataFim)

  const { data, error } = await q
  if (error) throw error
  return data as Lancamento[]
}

export async function atualizarStatusLancamento(id: string, status: string) {
  const { error } = await supabase.from('lancamentos').update({ status }).eq('id', id)
  if (error) throw error
}

export interface EdicaoLancamento {
  data_atendimento: string
  paciente: string
  nome_responsavel?: string
  data_pagamento?: string
  meio_pagamento?: string[]
  parceria_id: ParceriaId
  valor_total: number
  observacoes?: string
}

export async function editarLancamento(id: string, dados: EdicaoLancamento) {
  const rateio = calcularRateio(dados.parceria_id, dados.valor_total)

  // 1. Atualiza o lançamento
  const { error } = await supabase
    .from('lancamentos')
    .update({ ...dados, ...rateio })
    .eq('id', id)
  if (error) throw error

  // 2. Recalcula rateio das parcelas pendentes
  const { data: parcelas } = await supabase
    .from('parcelas')
    .select('id, valor_parcela')
    .eq('lancamento_id', id)
    .eq('status', 'pendente')

  if (parcelas && parcelas.length > 0) {
    await Promise.all(
      parcelas.map(p => {
        const rateioParc = calcularRateio(dados.parceria_id, Number(p.valor_parcela))
        return supabase
          .from('parcelas')
          .update(rateioParc)
          .eq('id', p.id)
      })
    )
  }
}

export async function deletarLancamento(id: string) {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id)
  if (error) throw error
}

export async function deletarEmLote(ids: string[], motivo: string) {
  // Busca dados para o log antes de excluir
  const { data: lancamentos, error: errBusca } = await supabase
    .from('lancamentos')
    .select('id, paciente, parceria_id, valor_total, num_parcelas')
    .in('id', ids)
  if (errBusca) throw errBusca

  const { data: { user } } = await supabase.auth.getUser()

  // Grava log de exclusão
  const logs = (lancamentos ?? []).map(l => ({
    lancamento_id: l.id,
    paciente:      l.paciente,
    parceria_id:   l.parceria_id,
    valor_total:   l.valor_total,
    num_parcelas:  l.num_parcelas ?? 1,
    motivo,
    excluido_por:  user?.id ?? null,
  }))
  if (logs.length > 0) {
    const { error: errLog } = await supabase.from('lancamentos_log').insert(logs)
    if (errLog) throw errLog
  }

  // Exclui lançamentos (parcelas removidas por CASCADE)
  const { error } = await supabase.from('lancamentos').delete().in('id', ids)
  if (error) throw error
}
