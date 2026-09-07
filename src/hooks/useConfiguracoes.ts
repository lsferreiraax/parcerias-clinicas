import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getConfiguracoes, salvarConfiguracoes,
  listarParcerias, salvarParceria, criarParceria,
  listarProfissionais, salvarProfissional,
} from '@/services/configuracoes'
import type { Configuracao, ParceriaCompleta, Profissional } from '@/types'

export function useConfiguracoes() {
  return useQuery({ queryKey: ['configuracoes'], queryFn: getConfiguracoes })
}

export function useSalvarConfiguracoes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Omit<Configuracao, 'id' | 'updated_at'>>) => salvarConfiguracoes(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracoes'] }),
  })
}

export function useParcerias() {
  return useQuery({ queryKey: ['parcerias-config'], queryFn: listarParcerias })
}

export function useSalvarParceria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ParceriaCompleta> }) => salvarParceria(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcerias-config'] }),
  })
}

export function useCriarParceria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: Omit<ParceriaCompleta, 'ativo'>) => criarParceria(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parcerias-config'] }),
  })
}

export function useProfissionais() {
  return useQuery({ queryKey: ['profissionais-config'], queryFn: listarProfissionais })
}

export function useSalvarProfissional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Profissional> }) => salvarProfissional(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profissionais-config'] }),
  })
}
