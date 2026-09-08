import type { ParceriaId, RateioResult } from '@/types'

export interface ParceriaConfig {
  camta_pct: number
  medico_pct: number
  psi1_pct: number
  psi2_pct: number
}

const arr = (v: number) => Math.round(v * 100) / 100

// DB armazena percentuais como inteiros (ex: 20 = 20%). Divide por 100 antes de multiplicar.
export function calcularRateio(config: ParceriaConfig, valor: number): RateioResult {
  return {
    camta_valor:  arr(valor * config.camta_pct  / 100),
    medico_valor: arr(valor * config.medico_pct / 100),
    psi1_valor:   arr(valor * config.psi1_pct   / 100),
    psi2_valor:   arr(valor * config.psi2_pct   / 100),
  }
}

export interface ValidacaoRateio {
  ok: boolean
  soma: number
  diferenca: number
}

// Verifica se os percentuais somam 100 (±0.1), considerando armazenamento como inteiros.
export function validarRateio(config: ParceriaConfig): ValidacaoRateio {
  const soma = config.camta_pct + config.medico_pct + config.psi1_pct + config.psi2_pct
  const diferenca = Math.abs(soma - 100)
  return { ok: diferenca <= 0.1, soma, diferenca }
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
