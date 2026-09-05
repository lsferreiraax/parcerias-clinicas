import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { parceria_id, valor } = await req.json()

    const percentuais: Record<string, { camta: number; medico: number; psi1: number; psi2: number }> = {
      A: { camta: 0.20, medico: 0,    psi1: 0.30, psi2: 0.50 },
      B: { camta: 0,    medico: 0.10, psi1: 0.40, psi2: 0.50 },
      C: { camta: 0,    medico: 0,    psi1: 0.40, psi2: 0.60 },
    }

    const p = percentuais[parceria_id]
    if (!p) throw new Error(`Parceria inválida: ${parceria_id}`)

    const arredondar = (v: number) => Math.round(v * 100) / 100

    return new Response(JSON.stringify({
      camta_valor:  arredondar(valor * p.camta),
      medico_valor: arredondar(valor * p.medico),
      psi1_valor:   arredondar(valor * p.psi1),
      psi2_valor:   arredondar(valor * p.psi2),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
