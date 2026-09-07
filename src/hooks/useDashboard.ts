import { useQuery } from '@tanstack/react-query'
import { getReceitaMensal, getInadimplenciaMensal, getKpiComparativo, getRankingProfissionais } from '@/services/dashboard'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export function useReceitaMensal() {
  return useQuery({ queryKey: ['receita-mensal'], queryFn: getReceitaMensal, staleTime: 60_000 })
}

export function useInadimplenciaMensal() {
  return useQuery({ queryKey: ['inadimplencia-mensal'], queryFn: getInadimplenciaMensal, staleTime: 60_000 })
}

export function useKpiComparativo() {
  return useQuery({ queryKey: ['kpi-comparativo'], queryFn: getKpiComparativo, refetchInterval: 60_000 })
}

export function useRankingProfissionais(mes: Date) {
  const iniMes = format(startOfMonth(mes), 'yyyy-MM-dd')
  const fimMes = format(endOfMonth(mes),   'yyyy-MM-dd')
  return useQuery({
    queryKey: ['ranking-profissionais', iniMes],
    queryFn: () => getRankingProfissionais(iniMes, fimMes),
  })
}
