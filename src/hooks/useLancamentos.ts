import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  criarLancamento, listarLancamentos, atualizarStatusLancamento,
  cancelarLancamento, deletarLancamento, editarLancamento,
  deletarEmLote, buscarLogEdicaoLancamento, verificarDuplicata,
} from '@/services/lancamentos'
import type { NovoLancamento, EdicaoLancamento } from '@/services/lancamentos'
import type { ParceriaId } from '@/types'

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

export function useCancelarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) => cancelarLancamento(id, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
      qc.invalidateQueries({ queryKey: ['kpis'] })
      qc.invalidateQueries({ queryKey: ['resumo-parceria'] })
    },
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

export function useVerificarDuplicata(
  paciente: string,
  dataAtendimento: string,
  parceriaId: ParceriaId
) {
  const ativo = paciente.trim().length >= 3 && !!dataAtendimento && !!parceriaId
  return useQuery({
    queryKey: ['duplicata', paciente.trim(), dataAtendimento, parceriaId],
    queryFn: () => verificarDuplicata(paciente.trim(), dataAtendimento, parceriaId),
    enabled: ativo,
    staleTime: 10_000,
  })
}

export function useLogEdicaoLancamento(lancamentoId: string | null) {
  return useQuery({
    queryKey: ['lancamento-log', lancamentoId],
    queryFn: () => buscarLogEdicaoLancamento(lancamentoId!),
    enabled: !!lancamentoId,
  })
}
