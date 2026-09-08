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

export interface ValidacaoRateio {
  ok: boolean
  soma: number
  diferenca: number
}

export function validarRateio(config: ParceriaConfig): ValidacaoRateio {
  const soma = config.camta_pct + config.medico_pct + config.psi1_pct + config.psi2_pct
  const diferenca = Math.abs(soma - 1)
  return { ok: diferenca <= 0.001, soma, diferenca }
}

export function validarResultadoRateio(resultado: RateioResult, valorTotal: number): { ok: boolean; diferenca: number } {
  const soma = resultado.camta_valor + resultado.medico_valor + resultado.psi1_valor + resultado.psi2_valor
  const diferenca = Math.abs(soma - valorTotal)
  return { ok: diferenca <= 0.02, diferenca }
}

export const CORES_PARCERIA: Record<ParceriaId, string> = {
  A: 'bg-blue-100 text-blue-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-yellow-100 text-yellow-800',
}
