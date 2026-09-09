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

export interface PontoMensal {
  mes: string      // 'Jan/25'
  isoMes: string   // '2025-01'
  valor: number
  atendimentos: number
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

export async function getExtratoMensal(
  profissional: TipoProfissional,
): Promise<PontoMensal[]> {
  const dozeAtras = new Date()
  dozeAtras.setMonth(dozeAtras.getMonth() - 11)
  dozeAtras.setDate(1)
  const dataInicio = dozeAtras.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('lancamentos')
    .select('data_atendimento, camta_valor, medico_valor, psi1_valor, psi2_valor')
    .gte('data_atendimento', dataInicio)
    .neq('status', 'cancelado')
    .order('data_atendimento', { ascending: true })

  if (error) throw error

  const coluna = `${profissional}_valor` as 'camta_valor' | 'medico_valor' | 'psi1_valor' | 'psi2_valor'

  // Agrupa por mês
  const map = new Map<string, { valor: number; atendimentos: number }>()
  for (const l of data ?? []) {
    const iso = l.data_atendimento.slice(0, 7) // 'YYYY-MM'
    const val = Number(l[coluna] ?? 0)
    if (val <= 0) continue
    const atual = map.get(iso) ?? { valor: 0, atendimentos: 0 }
    map.set(iso, { valor: atual.valor + val, atendimentos: atual.atendimentos + 1 })
  }

  // Gera os 12 meses em ordem, com zero nos meses sem dados
  const pontos: PontoMensal[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const iso  = d.toISOString().slice(0, 7)
    const mes  = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
               .replace('.', '').replace(/^(\w)/, c => c.toUpperCase())
    const info = map.get(iso) ?? { valor: 0, atendimentos: 0 }
    pontos.push({ mes, isoMes: iso, valor: info.valor, atendimentos: info.atendimentos })
  }
  return pontos
}
