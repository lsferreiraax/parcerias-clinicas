import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getResumoPorParceria, getResumoProfissional, getKPIs } from '@/services/resumo'
import { listarParcelas, marcarParcelaPaga, atualizarStatusParcela } from '@/services/parcelas'

export function useResumoParceria() {
  return useQuery({ queryKey: ['resumo-parceria'], queryFn: getResumoPorParceria })
}

export function useResumoProfissional() {
  return useQuery({ queryKey: ['resumo-profissional'], queryFn: getResumoProfissional })
}

export function useKPIs() {
  return useQuery({ queryKey: ['kpis'], queryFn: getKPIs, refetchInterval: 30_000 })
}

export function useParcelas(filtros?: Parameters<typeof listarParcelas>[0]) {
  return useQuery({
    queryKey: ['parcelas', filtros],
    queryFn: () => listarParcelas(filtros),
  })
}

export function useMarcarParcelaPaga() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => marcarParcelaPaga(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parcelas'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['resumo-parceria'] })
    },
  })
}

export function useAtualizarStatusParcela() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, dataPagamento }: { id: string; status: string; dataPagamento?: string }) =>
      atualizarStatusParcela(id, status, dataPagamento),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parcelas'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
    },
  })
}
