import { useQuery } from '@tanstack/react-query'
import { getExtrato, getExtratoMensal } from '@/services/extrato'
import type { TipoProfissional } from '@/services/extrato'

export function useExtrato(
  profissional: TipoProfissional,
  filtro?: { dataInicio?: string; dataFim?: string },
  profissionalId?: string,
) {
  return useQuery({
    queryKey: ['extrato', profissional, filtro, profissionalId],
    queryFn: () => getExtrato(profissional, filtro, profissionalId),
  })
}

export function useExtratoMensal(profissional: TipoProfissional, profissionalId?: string) {
  return useQuery({
    queryKey: ['extrato-mensal', profissional, profissionalId],
    queryFn: () => getExtratoMensal(profissional, profissionalId),
    staleTime: 5 * 60 * 1000,
  })
}
