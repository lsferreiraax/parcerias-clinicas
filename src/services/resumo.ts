import { supabase } from '@/lib/supabase'
import type { ResumoParceria, ResumoProfissional } from '@/types'

export async function getResumoPorParceria(): Promise<ResumoParceria[]> {
  const { data, error } = await supabase.from('resumo_por_parceria').select('*')
  if (error) throw error
  return data as ResumoParceria[]
}

export async function getResumoProfissional(): Promise<ResumoProfissional[]> {
  const { data, error } = await supabase.from('resumo_profissional').select('*')
  if (error) throw error
  return data as ResumoProfissional[]
}

export async function getKPIs() {
  const [lanc, parc] = await Promise.all([
    supabase.from('lancamentos').select('valor_total, status'),
    supabase.from('parcelas').select('valor_parcela, status, data_vencimento'),
  ])

  const lancamentos = lanc.data ?? []
  const parcelas    = parc.data ?? []
  const hoje        = new Date().toISOString().split('T')[0]

  return {
    totalAtendimentos: lancamentos.length,
    receitaTotal: lancamentos.reduce((s, l) => s + Number(l.valor_total), 0),
    receitaPaga:  lancamentos.filter(l => l.status === 'pago').reduce((s, l) => s + Number(l.valor_total), 0),
    parcelasVencidas: parcelas.filter(p => p.status === 'pendente' && p.data_vencimento < hoje).length,
    parcelasPendentes: parcelas.filter(p => p.status === 'pendente').length,
  }
}
