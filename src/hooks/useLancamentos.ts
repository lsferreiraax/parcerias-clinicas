import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { criarLancamento, listarLancamentos, atualizarStatusLancamento, deletarLancamento, editarLancamento, deletarEmLote } from '@/services/lancamentos'
import type { NovoLancamento, EdicaoLancamento } from '@/services/lancamentos'

export function useLancamentos(filtros?: Parameters<typeof listarLancamentos>[0]) {
  return useQuery({
    queryKey: ['lancamentos', filtros],
    queryFn: () => listarLancamentos(filtros),
  })
}

export function useCriarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: NovoLancamento) => criarLancamento(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
  })
}

export function useAtualizarStatusLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => atualizarStatusLancamento(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
  })
}

export function useDeletarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletarLancamento(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
  })
}

export function useDeletarEmLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, motivo }: { ids: string[]; motivo: string }) => deletarEmLote(ids, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['resumo-parceria'] })
      qc.invalidateQueries({ queryKey: ['kpi-comparativo'] })
      qc.invalidateQueries({ queryKey: ['receita-mensal'] })
    },
  })
}

export function useEditarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: EdicaoLancamento }) => editarLancamento(id, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['resumo-parceria'] })
      qc.invalidateQueries({ queryKey: ['kpi-comparativo'] })
      qc.invalidateQueries({ queryKey: ['receita-mensal'] })
    },
  })
}
