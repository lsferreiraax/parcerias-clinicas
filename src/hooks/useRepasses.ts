import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarRepasses, editarValorRepasse, conciliarRepasse,
  desconciliarRepasse, conciliarEmLote, buscarLogRepasse,
  contarRepassesPendentes,
} from '@/services/repasses'
import type { FiltroRepasse } from '@/services/repasses'

export function useRepasses(filtro?: FiltroRepasse) {
  return useQuery({
    queryKey: ['repasses', filtro],
    queryFn: () => listarRepasses(filtro),
  })
}

export function useEditarValorRepasse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, novoValor, motivo }: { id: string; novoValor: number; motivo: string }) =>
      editarValorRepasse(id, novoValor, motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repasses'] }),
  })
}

export function useConciliarRepasse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dataRepasse }: { id: string; dataRepasse: string }) =>
      conciliarRepasse(id, dataRepasse),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repasses'] }),
  })
}

export function useDesconciliarRepasse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      desconciliarRepasse(id, motivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repasses'] }),
  })
}

export function useConciliarEmLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, dataRepasse }: { ids: string[]; dataRepasse: string }) =>
      conciliarEmLote(ids, dataRepasse),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repasses'] }),
  })
}

export function useRepassesPendentesAlerta() {
  return useQuery({
    queryKey: ['repasses-alerta'],
    queryFn: contarRepassesPendentes,
    refetchInterval: 5 * 60_000,
  })
}

export function useLogRepasse(repasseId: string | null) {
  return useQuery({
    queryKey: ['repasse-log', repasseId],
    queryFn: () => buscarLogRepasse(repasseId!),
    enabled: !!repasseId,
  })
}
