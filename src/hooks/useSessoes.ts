import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarSessoes,
  criarSessao,
  atualizarSessao,
  deletarSessao,
  NovaSessao,
} from '@/services/sessoes'

export function useSessoes(dataInicio: string, dataFim: string, profissional_id?: string) {
  return useQuery({
    queryKey: ['sessoes', dataInicio, dataFim, profissional_id],
    queryFn: () => listarSessoes(dataInicio, dataFim, profissional_id),
    enabled: !!dataInicio && !!dataFim,
  })
}

export function useCriarSessao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: NovaSessao) => criarSessao(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessoes'] }),
  })
}

export function useAtualizarSessao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<NovaSessao> }) =>
      atualizarSessao(id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessoes'] }),
  })
}

export function useDeletarSessao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletarSessao(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessoes'] }),
  })
}
