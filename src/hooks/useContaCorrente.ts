import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarMovimentacoes,
  listarSaldos,
  criarMovimentacao,
  liquidarMovimentacao,
  cancelarMovimentacao,
  liquidarCompetencia,
  type NovaMovimentacao,
} from '@/services/contaCorrente'

export function useMovimentacoes(competencia?: string, parceria_id?: string) {
  return useQuery({
    queryKey: ['movimentacoes', competencia, parceria_id],
    queryFn: () => listarMovimentacoes(competencia, parceria_id),
  })
}

export function useSaldos(competencia?: string) {
  return useQuery({
    queryKey: ['saldos-parceria', competencia],
    queryFn: () => listarSaldos(competencia),
  })
}

export function useCriarMovimentacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: NovaMovimentacao) => criarMovimentacao(dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['saldos-parceria'] })
    },
  })
}

export function useLiquidarMovimentacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => liquidarMovimentacao(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['saldos-parceria'] })
    },
  })
}

export function useCancelarMovimentacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelarMovimentacao(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['saldos-parceria'] })
    },
  })
}

export function useLiquidarCompetencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ competencia, parceria_id }: { competencia: string; parceria_id?: string }) =>
      liquidarCompetencia(competencia, parceria_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentacoes'] })
      qc.invalidateQueries({ queryKey: ['saldos-parceria'] })
    },
  })
}
