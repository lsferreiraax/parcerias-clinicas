import { useQuery } from '@tanstack/react-query'
import { getExtrato, getExtratoMensal } from '@/services/extrato'
import type { TipoProfissional } from '@/services/extrato'

export function useExtrato(
  profissional: TipoProfissional,
  filtro?: { dataInicio?: string; dataFim?: string },
) {
  return useQuery({
    queryKey: ['extrato', profissional, filtro],
    queryFn: () => getExtrato(profissional, filtro),
  })
}

export function useExtratoMensal(profissional: TipoProfissional) {
  return useQuery({
    queryKey: ['extrato-mensal', profissional],
    queryFn: () => getExtratoMensal(profissional),
    staleTime: 5 * 60 * 1000,
  })
}
