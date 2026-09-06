import { supabase } from '@/lib/supabase'

export type TipoProfissional = 'camta' | 'medico' | 'psi1' | 'psi2'

export interface LinhaExtrato {
  id: string
  data_atendimento: string
  paciente: string
  parceria_id: string
  forma_pagamento: string
  valor_total: number
  valor_profissional: number
  status: string
}

export async function getExtrato(
  profissional: TipoProfissional,
  filtro?: { dataInicio?: string; dataFim?: string },
): Promise<LinhaExtrato[]> {
  let q = supabase
    .from('lancamentos')
    .select(`id, data_atendimento, paciente, parceria_id, forma_pagamento, valor_total,
             camta_valor, medico_valor, psi1_valor, psi2_valor, status`)
    .order('data_atendimento', { ascending: false })

  if (filtro?.dataInicio) q = q.gte('data_atendimento', filtro.dataInicio)
  if (filtro?.dataFim)    q = q.lte('data_atendimento', filtro.dataFim)

  const { data, error } = await q
  if (error) throw error

  type Row = typeof data extends (infer R)[] | null ? R : never

  const valorProfissional = (l: Row) => {
    const map: Record<TipoProfissional, number> = {
      camta:  Number(l.camta_valor),
      medico: Number(l.medico_valor),
      psi1:   Number(l.psi1_valor),
      psi2:   Number(l.psi2_valor),
    }
    return map[profissional]
  }

  return (data ?? [])
    .filter(l => valorProfissional(l) > 0)
    .map(l => ({
      id:                 l.id,
      data_atendimento:   l.data_atendimento,
      paciente:           l.paciente,
      parceria_id:        l.parceria_id,
      forma_pagamento:    l.forma_pagamento,
      valor_total:        Number(l.valor_total),
      valor_profissional: valorProfissional(l),
      status:             l.status,
    }))
}
