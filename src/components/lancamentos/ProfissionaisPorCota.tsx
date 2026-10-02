import { useEffect } from 'react'
import { Select } from '@/components/ui'
import { TIPOS_COTA } from '@/services/lancamentos'
import type { PessoasPorCota, TipoCota } from '@/services/lancamentos'
import type { ParceriaConfig } from '@/services/rateio'
import type { Profissional } from '@/types'

export const ROTULO_COTA: Record<TipoCota, string> = { camta: 'Camta', medico: 'Médico', psi1: 'Psi1', psi2: 'Psi2' }

/** Cotas que a parceria realmente paga (percentual > 0). */
export function cotasDaParceria(config: ParceriaConfig | null): TipoCota[] {
  if (!config) return []
  return TIPOS_COTA.filter(t => Number(config[`${t}_pct` as keyof ParceriaConfig]) > 0)
}

/** Profissionais ativos do tipo; mantém também a pessoa já gravada, mesmo que hoje esteja inativa. */
export function opcoesDoTipo(profissionais: Profissional[], tipo: TipoCota, atualId?: string): Profissional[] {
  return profissionais.filter(p => p.tipo === tipo && (p.ativo || p.id === atualId))
}

const ativosDoTipo = (profissionais: Profissional[], tipo: TipoCota) =>
  profissionais.filter(p => p.tipo === tipo && p.ativo)

/** Mantém as escolhas válidas, descarta cotas sem percentual e pré-seleciona quando só há 1 profissional ativo do tipo. */
export function sugerirPessoas(
  config: ParceriaConfig | null, profissionais: Profissional[], atual: PessoasPorCota,
): PessoasPorCota {
  const out: PessoasPorCota = {}
  for (const t of cotasDaParceria(config)) {
    const escolhida = atual[t]
    if (escolhida && profissionais.some(p => p.id === escolhida && p.tipo === t)) { out[t] = escolhida; continue }
    const ativos = ativosDoTipo(profissionais, t)
    if (ativos.length === 1) out[t] = ativos[0].id
  }
  return out
}

/** Cotas que exigem pessoa (há profissional ativo do tipo) e ainda não têm. */
export function cotasSemPessoa(
  config: ParceriaConfig | null, profissionais: Profissional[], pessoas: PessoasPorCota,
): TipoCota[] {
  return cotasDaParceria(config).filter(t => ativosDoTipo(profissionais, t).length > 0 && !pessoas[t])
}

interface Props {
  config: ParceriaConfig | null
  profissionais: Profissional[]
  value: PessoasPorCota
  onChange: (v: PessoasPorCota) => void
}

/** Escolha da pessoa que recebe cada cota do rateio (DT17). */
export default function ProfissionaisPorCota({ config, profissionais, value, onChange }: Props) {
  const cotas = cotasDaParceria(config)

  // pré-seleciona quando só há uma pessoa ativa e descarta cotas que a parceria não paga
  useEffect(() => {
    const prox = sugerirPessoas(config, profissionais, value)
    if (JSON.stringify(prox) !== JSON.stringify(value)) onChange(prox)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, profissionais])

  if (cotas.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3" data-testid="profissionais-por-cota">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Profissional de cada cota</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cotas.map(t => {
          const opcoes = opcoesDoTipo(profissionais, t, value[t])
          return (
            <div key={t}>
              <Select label={`Profissional — ${ROTULO_COTA[t]}`} value={value[t] ?? ''}
                disabled={opcoes.length === 0}
                onChange={e => onChange({ ...value, [t]: e.target.value || undefined })}>
                <option value="">{opcoes.length === 0 ? 'Nenhum profissional ativo' : 'Selecione...'}</option>
                {opcoes.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}{p.ativo ? '' : ' (inativo)'}</option>
                ))}
              </Select>
              {opcoes.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">Sem profissional ativo deste tipo: salva sem pessoa e é atribuído depois.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
