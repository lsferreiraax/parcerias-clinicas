import { supabase } from '@/lib/supabase'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface ReceitaMes {
  mes: string        // "Jan/25"
  mesISO: string     // "2025-01"
  receita: number
  parcelaA: number
  parcelaB: number
  parcelaC: number
}

export interface InadimplenciaMes {
  mes: string
  vencidas: number
  pagas: number
  taxa: number       // % inadimplência
}

export interface KpiComparativo {
  receitaMes: number
  receitaMesAnterior: number
  ticketMedio: number
  ticketMedioAnterior: number
  parcelasEmAberto: number
  valorEmAberto: number
  atendimentosMes: number
}

export interface RankingProfissional {
  nome: string
  tipo: string
  total: number
}

// Últimos N meses (inclusive o atual)
function ultimos12Meses() {
  const agora = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(agora, 11 - i)
    return {
      label:  format(d, "MMM/yy", { locale: ptBR }),
      inicio: format(startOfMonth(d), 'yyyy-MM-dd'),
      fim:    format(endOfMonth(d),   'yyyy-MM-dd'),
      iso:    format(d, 'yyyy-MM'),
    }
  })
}

export async function getReceitaMensal(): Promise<ReceitaMes[]> {
  const meses = ultimos12Meses()
  const inicio = meses[0].inicio
  const fim    = meses[meses.length - 1].fim

  const { data, error } = await supabase
    .from('lancamentos')
    .select('data_atendimento, parceria_id, valor_total')
    .gte('data_atendimento', inicio)
    .lte('data_atendimento', fim)

  if (error) throw error

  const mapa: Record<string, ReceitaMes> = {}
  for (const m of meses) {
    mapa[m.iso] = { mes: m.label, mesISO: m.iso, receita: 0, parcelaA: 0, parcelaB: 0, parcelaC: 0 }
  }

  for (const l of data ?? []) {
    const iso = l.data_atendimento.slice(0, 7)
    if (!mapa[iso]) continue
    const v = Number(l.valor_total)
    mapa[iso].receita += v
    if (l.parceria_id === 'A') mapa[iso].parcelaA += v
    if (l.parceria_id === 'B') mapa[iso].parcelaB += v
    if (l.parceria_id === 'C') mapa[iso].parcelaC += v
  }

  return meses.map(m => mapa[m.iso])
}

export async function getInadimplenciaMensal(): Promise<InadimplenciaMes[]> {
  const meses = ultimos12Meses()
  const inicio = meses[0].inicio
  const fim    = meses[meses.length - 1].fim

  const { data, error } = await supabase
    .from('parcelas')
    .select('data_vencimento, status')
    .gte('data_vencimento', inicio)
    .lte('data_vencimento', fim)

  if (error) throw error

  const mapa: Record<string, { vencidas: number; pagas: number }> = {}
  for (const m of meses) mapa[m.iso] = { vencidas: 0, pagas: 0 }

  for (const p of data ?? []) {
    const iso = p.data_vencimento.slice(0, 7)
    if (!mapa[iso]) continue
    if (p.status === 'pago') mapa[iso].pagas++
    else mapa[iso].vencidas++
  }

  return meses.map(m => {
    const { vencidas, pagas } = mapa[m.iso]
    const total = vencidas + pagas
    return {
      mes: m.label,
      vencidas,
      pagas,
      taxa: total > 0 ? Math.round((vencidas / total) * 100) : 0,
    }
  })
}

export async function getKpiComparativo(): Promise<KpiComparativo> {
  const agora   = new Date()
  const iniMes  = format(startOfMonth(agora), 'yyyy-MM-dd')
  const fimMes  = format(endOfMonth(agora),   'yyyy-MM-dd')
  const iniAnt  = format(startOfMonth(subMonths(agora, 1)), 'yyyy-MM-dd')
  const fimAnt  = format(endOfMonth(subMonths(agora, 1)),   'yyyy-MM-dd')
  const hoje    = format(agora, 'yyyy-MM-dd')

  const [mes, ant, aberto] = await Promise.all([
    supabase.from('lancamentos').select('valor_total').gte('data_atendimento', iniMes).lte('data_atendimento', fimMes),
    supabase.from('lancamentos').select('valor_total').gte('data_atendimento', iniAnt).lte('data_atendimento', fimAnt),
    supabase.from('parcelas').select('valor_parcela').eq('status', 'pendente').lt('data_vencimento', hoje),
  ])

  if (mes.error) throw mes.error
  if (ant.error) throw ant.error
  if (aberto.error) throw aberto.error

  const soma = (arr: { valor_total: number }[]) => arr.reduce((s, l) => s + Number(l.valor_total), 0)

  const receitaMes      = soma(mes.data ?? [])
  const receitaAnt      = soma(ant.data ?? [])
  const atendimentosMes = (mes.data ?? []).length
  const atendimentosAnt = (ant.data ?? []).length

  return {
    receitaMes,
    receitaMesAnterior:    receitaAnt,
    ticketMedio:           atendimentosMes > 0 ? receitaMes / atendimentosMes : 0,
    ticketMedioAnterior:   atendimentosAnt > 0 ? receitaAnt / atendimentosAnt : 0,
    parcelasEmAberto:      (aberto.data ?? []).length,
    valorEmAberto:         (aberto.data ?? []).reduce((s, p) => s + Number(p.valor_parcela), 0),
    atendimentosMes,
  }
}

export async function getRankingProfissionais(iniMes: string, fimMes: string): Promise<RankingProfissional[]> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('camta_valor, medico_valor, psi1_valor, psi2_valor')
    .gte('data_atendimento', iniMes)
    .lte('data_atendimento', fimMes)

  if (error) throw error

  const totais = { camta: 0, medico: 0, psi1: 0, psi2: 0 }
  for (const l of data ?? []) {
    totais.camta  += Number(l.camta_valor)
    totais.medico += Number(l.medico_valor)
    totais.psi1   += Number(l.psi1_valor)
    totais.psi2   += Number(l.psi2_valor)
  }

  return [
    { nome: 'Camta',  tipo: 'camta',  total: totais.camta  },
    { nome: 'Médico', tipo: 'medico', total: totais.medico },
    { nome: 'Psi1',   tipo: 'psi1',   total: totais.psi1   },
    { nome: 'Psi2',   tipo: 'psi2',   total: totais.psi2   },
  ].sort((a, b) => b.total - a.total)
}
