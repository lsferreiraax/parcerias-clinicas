import type { ParceríaId, RateioResult } from '@/types'

const PERCENTUAIS: Record<ParceríaId, { camta: number; medico: number; psi1: number; psi2: number }> = {
  A: { camta: 0.20, medico: 0,    psi1: 0.30, psi2: 0.50 },
  B: { camta: 0,    medico: 0.10, psi1: 0.40, psi2: 0.50 },
  C: { camta: 0,    medico: 0,    psi1: 0.40, psi2: 0.60 },
}

const arr = (v: number) => Math.round(v * 100) / 100

export function calcularRateio(parceríaId: ParceríaId, valor: number): RateioResult {
  const p = PERCENTUAIS[parceríaId]
  return {
    camta_valor:  arr(valor * p.camta),
    medico_valor: arr(valor * p.medico),
    psi1_valor:   arr(valor * p.psi1),
    psi2_valor:   arr(valor * p.psi2),
  }
}

export const LABELS_PARCERIA: Record<ParceríaId, string> = {
  A: 'Parceria A — Camta 20% · Psi1 30% · Psi2 50%',
  B: 'Parceria B — Médico 10% · Psi1 40% · Psi2 50%',
  C: 'Parceria C — Psi1 40% · Psi2 60%',
}

export const CORES_PARCERIA: Record<ParceríaId, string> = {
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-yellow-100 text-yellow-800',
}
