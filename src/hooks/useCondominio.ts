import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCondominioAlerta() {
  return useQuery({
    queryKey: ['condominio-alerta'],
    queryFn: async (): Promise<number> => {
      const hoje = new Date()
      const compAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

      // Busca demonstrativos de competências anteriores ao mês atual
      const { data: dems, error: e1 } = await supabase
        .schema('psicologia')
        .from('demonstrativos_condominio')
        .select('id')
        .lt('competencia', compAtual)

      if (e1 || !dems?.length) return 0

      const ids = dems.map(d => d.id)
      const { count, error: e2 } = await supabase
        .schema('psicologia')
        .from('demonstrativo_itens')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .in('demonstrativo_id', ids)

      if (e2) return 0
      return count ?? 0
    },
    refetchInterval: 60_000,
  })
}
