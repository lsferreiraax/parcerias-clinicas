import { supabase } from '@/lib/supabase'
import { calcularRateio } from './rateio'
import type { Lancamento, ParceriaId, FormaPagamento } from '@/types'
import type { ParceriaConfig } from './rateio'

async function getParceriaConfig(parceriaId: ParceriaId): Promise<ParceriaConfig> {
  const { data, error } = await supabase
    .from('parcerias')
    .select('camta_pct, medico_pct, psi1_pct, psi2_pct')
    .eq('id', parceriaId)
    .single()
  if (error) throw error
  return data as ParceriaConfig
}

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
  const config = await getParceriaConfig(dados.parceria_id)
  const rateio = calcularRateio(config, dados.valor_total)

  const { data, error } = await supabase
    .from('lancamentos')
    .insert({ ...dados, ...rateio })
    .select()
    .single()

  if (error) throw error

  if (dados.forma_pagamento === 'parcelado' && dados.num_parcelas > 1) {
    const valorParcela = Math.round((dados.valor_total / dados.num_parcelas) * 100) / 100
    const rateioParc = calcularRateio(config, valorParcela)
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

export interface DuplicataInfo {
  id: string
  data_atendimento: string
  paciente: string
  valor_total: number
  status: string
}

export async function verificarDuplicata(
  paciente: string,
  dataAtendimento: string,
  parceriaId: ParceriaId
): Promise<DuplicataInfo | null> {
  if (!paciente.trim() || !dataAtendimento || !parceriaId) return null

  // Janela de ±1 dia ao redor da data informada
  const d    = new Date(dataAtendimento)
  const ant  = new Date(d); ant.setDate(ant.getDate() - 1)
  const dep  = new Date(d); dep.setDate(dep.getDate() + 1)
  const ini  = ant.toISOString().split('T')[0]
  const fim  = dep.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('lancamentos')
    .select('id, data_atendimento, paciente, valor_total, status')
    .eq('paciente', paciente.trim())
    .eq('parceria_id', parceriaId)
    .neq('status', 'cancelado')
    .gte('data_atendimento', ini)
    .lte('data_atendimento', fim)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as DuplicataInfo
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

export async function cancelarLancamento(id: string, motivo: string) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: atual, error: errBusca } = await supabase
    .from('lancamentos')
    .select('status, paciente, parceria_id, valor_total')
    .eq('id', id)
    .single()
  if (errBusca) throw errBusca

  if (atual.status === 'pago') throw new Error('Lançamentos pagos não podem ser cancelados.')

  const { error } = await supabase
    .from('lancamentos')
    .update({ status: 'cancelado' })
    .eq('id', id)
  if (error) throw error

  await supabase.from('lancamentos_edicoes_log').insert({
    lancamento_id:  id,
    campo:          'status',
    valor_anterior: atual.status,
    valor_novo:     'cancelado',
    motivo,
    alterado_por:   user?.id ?? null,
  })
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

type CampoAuditoria = { key: 'data_atendimento' | 'paciente' | 'parceria_id' | 'valor_total' | 'observacoes'; label: string }

const CAMPOS_AUDITORIA: CampoAuditoria[] = [
  { key: 'data_atendimento', label: 'Data do Atendimento' },
  { key: 'paciente',         label: 'Paciente'            },
  { key: 'parceria_id',      label: 'Parceria'            },
  { key: 'valor_total',      label: 'Valor Total'         },
  { key: 'observacoes',      label: 'Observações'         },
]

export async function editarLancamento(id: string, dados: EdicaoLancamento) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: atual, error: errBusca } = await supabase
    .from('lancamentos')
    .select('data_atendimento, paciente, parceria_id, valor_total, observacoes')
    .eq('id', id)
    .single()
  if (errBusca) throw errBusca

  const config = await getParceriaConfig(dados.parceria_id)
  const rateio = calcularRateio(config, dados.valor_total)

  const { error } = await supabase
    .from('lancamentos')
    .update({ ...dados, ...rateio })
    .eq('id', id)
  if (error) throw error

  // Grava log dos campos alterados
  const atualTyped = atual as Record<CampoAuditoria['key'], unknown>
  const dadosTyped = dados as Record<CampoAuditoria['key'], unknown>
  const logs = CAMPOS_AUDITORIA
    .filter(({ key }) => String(atualTyped[key] ?? '') !== String(dadosTyped[key] ?? ''))
    .map(({ key, label }) => ({
      lancamento_id:  id,
      campo:          label,
      valor_anterior: String(atualTyped[key] ?? ''),
      valor_novo:     String(dadosTyped[key] ?? ''),
      alterado_por:   user?.id ?? null,
    }))

  if (logs.length > 0) {
    await supabase.from('lancamentos_edicoes_log').insert(logs)
  }

  // Recalcula rateio das parcelas pendentes
  const { data: parcelas } = await supabase
    .from('parcelas')
    .select('id, valor_parcela')
    .eq('lancamento_id', id)
    .eq('status', 'pendente')

  if (parcelas && parcelas.length > 0) {
    await Promise.all(
      parcelas.map(p => {
        const rateioParc = calcularRateio(config, Number(p.valor_parcela))
        return supabase
          .from('parcelas')
          .update(rateioParc)
          .eq('id', p.id)
      })
    )
  }
}

export async function buscarLogEdicaoLancamento(lancamentoId: string) {
  const { data, error } = await supabase
    .from('lancamentos_edicoes_log')
    .select('*')
    .eq('lancamento_id', lancamentoId)
    .order('alterado_em', { ascending: false })
  if (error) throw error
  return data
}

export async function deletarLancamento(id: string) {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id)
  if (error) throw error
}

export async function deletarEmLote(ids: string[], motivo: string) {
  const { data: lancamentos, error: errBusca } = await supabase
    .from('lancamentos')
    .select('id, paciente, parceria_id, valor_total, num_parcelas')
    .in('id', ids)
  if (errBusca) throw errBusca

  const { data: { user } } = await supabase.auth.getUser()

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

  const { error } = await supabase.from('lancamentos').delete().in('id', ids)
  if (error) throw error
}
