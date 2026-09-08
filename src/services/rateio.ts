import type { ParceriaId, RateioResult } from '@/types'

export interface ParceriaConfig {
  camta_pct: number
  medico_pct: number
  psi1_pct: number
  psi2_pct: number
}

const arr = (v: number) => Math.round(v * 100) / 100

export function calcularRateio(config: ParceriaConfig, valor: number): RateioResult {
  return {
    camta_valor:  arr(valor * config.camta_pct),
    medico_valor: arr(valor * config.medico_pct),
    psi1_valor:   arr(valor * config.psi1_pct),
    psi2_valor:   arr(valor * config.psi2_pct),
  }
}

export const CORES_PARCERIA: Record<ParceriaId, string> = {
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-yellow-100 text-yellow-800',
}
