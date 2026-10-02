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
  profissionalId?: string,
): Promise<LinhaExtrato[]> {
  // Função SECURITY DEFINER (migration 038): quem não tem acesso financeiro só recebe o próprio tipo.
  const { data, error } = await supabase.rpc('extrato_profissional', {
    p_tipo:   profissional,
    p_inicio: filtro?.dataInicio ?? null,
    p_fim:    filtro?.dataFim ?? null,
    // DT17: admin/financeiro podem pedir uma pessoa; para os demais o banco usa o próprio profissional_id
    ...(profissionalId ? { p_profissional_id: profissionalId } : {}),
  })
  if (error) throw error

  return ((data ?? []) as Record<string, unknown>[]).map(l => ({
    id:                 l.id as string,
    data_atendimento:   l.data_atendimento as string,
    paciente:           l.paciente as string,
    parceria_id:        l.parceria_id as string,
    forma_pagamento:    l.forma_pagamento as string,
    valor_total:        Number(l.valor_total),
    valor_profissional: Number(l.valor_profissional),
    status:             l.status as string,
  }))
}

export async function getExtratoMensal(
  profissional: TipoProfissional,
  profissionalId?: string,
): Promise<PontoMensal[]> {
  const dozeAtras = new Date()
  dozeAtras.setMonth(dozeAtras.getMonth() - 11)
  dozeAtras.setDate(1)
  const dataInicio = dozeAtras.toISOString().slice(0, 10)

  const { data, error } = await supabase.rpc('extrato_mensal', {
    p_tipo:  profissional,
    p_desde: dataInicio,
    ...(profissionalId ? { p_profissional_id: profissionalId } : {}),
  })
  if (error) throw error

  // Indexa por mês
  const map = new Map<string, { valor: number; atendimentos: number }>()
  for (const l of (data ?? []) as { iso_mes: string; valor: number; atendimentos: number }[]) {
    map.set(l.iso_mes, { valor: Number(l.valor), atendimentos: Number(l.atendimentos) })
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
