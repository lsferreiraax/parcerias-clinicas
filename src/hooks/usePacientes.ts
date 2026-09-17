import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarPacientes,
  buscarPacientes,
  criarPaciente,
  atualizarPaciente,
  desativarPaciente,
  NovoPaciente,
} from '@/services/pacientes'

export function usePacientes(ativos = true) {
  return useQuery({
    queryKey: ['pacientes', ativos],
    queryFn: () => listarPacientes(ativos),
  })
}

export function useBuscarPacientes(termo: string) {
  return useQuery({
    queryKey: ['pacientes-busca', termo],
    queryFn: () => buscarPacientes(termo),
    enabled: termo.length >= 2,
  })
}

export function useCriarPaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: NovoPaciente) => criarPaciente(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  })
}

export function useAtualizarPaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<NovoPaciente> }) =>
      atualizarPaciente(id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  })
}

export function useDesativarPaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => desativarPaciente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pacientes'] }),
  })
}
