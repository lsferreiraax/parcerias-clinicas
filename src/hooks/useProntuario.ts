import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarProntuarios,
  criarProntuario,
  atualizarProntuario,
  deletarProntuario,
  NovoProntuario,
} from '@/services/prontuario'
import { useAuth } from '@/contexts/AuthContext'

export function useProntuarios(paciente_id?: string) {
  return useQuery({
    queryKey: ['prontuarios', paciente_id ?? 'todos'],
    queryFn: () => listarProntuarios(paciente_id),
    enabled: true,
  })
}

export function useCriarProntuario() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (dados: NovoProntuario) =>
      criarProntuario({ ...dados, criado_por: user!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prontuarios'] }),
  })
}

export function useAtualizarProntuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<NovoProntuario> }) =>
      atualizarProntuario(id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prontuarios'] }),
  })
}

export function useDeletarProntuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletarProntuario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prontuarios'] }),
  })
}
