import { supabase } from '@/lib/supabase'
import { calcularRateio } from './rateio'
import type { Lancamento, ParceriaId, FormaPagamento } from '@/types'

export interface NovoLancamento {
  data_atendimento: string
  paciente: string
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

export async function deletarLancamento(id: string) {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id)
  if (error) throw error
}
