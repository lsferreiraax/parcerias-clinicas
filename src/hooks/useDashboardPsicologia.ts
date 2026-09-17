import { useQuery } from '@tanstack/react-query'
import { getDashboardPsicologia } from '@/services/dashboard-psicologia'

export function useDashboardPsicologia() {
  return useQuery({
    queryKey: ['dashboard-psicologia'],
    queryFn: getDashboardPsicologia,
    staleTime: 60_000,
  })
}
