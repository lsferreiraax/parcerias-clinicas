import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getResumoPorParceria, getResumoProfissional, getKPIs } from '@/services/resumo'
import type { FiltroResumo } from '@/services/resumo'
import {
  listarParcelas, marcarParcelaPaga, atualizarStatusParcela,
  baixarEmLote, renegociarParcela, buscarHistorico, contarParcelasAlerta,
} from '@/services/parcelas'

export function useResumoParceria(filtro?: FiltroResumo) {
  return useQuery({ queryKey: ['resumo-parceria', filtro], queryFn: () => getResumoPorParceria(filtro) })
}

export function useResumoProfissional(filtro?: FiltroResumo) {
  return useQuery({ queryKey: ['resumo-profissional', filtro], queryFn: () => getResumoProfissional(filtro) })
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

export function useBaixarEmLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => baixarEmLote(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parcelas'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['parcelas-alerta'] })
    },
  })
}

export function useRenegociarParcela() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, novaData, observacoes }: { id: string; novaData: string; observacoes: string }) =>
      renegociarParcela(id, novaData, observacoes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parcelas'] })
    },
  })
}

export function useHistoricoParcela(parcelaId: string | null) {
  return useQuery({
    queryKey: ['historico-parcela', parcelaId],
    queryFn: () => buscarHistorico(parcelaId!),
    enabled: !!parcelaId,
  })
}

export function useParcelasAlerta() {
  return useQuery({
    queryKey: ['parcelas-alerta'],
    queryFn: contarParcelasAlerta,
    refetchInterval: 5 * 60_000,
  })
}
