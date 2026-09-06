import { useQuery } from '@tanstack/react-query'
import { getExtrato } from '@/services/extrato'
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
