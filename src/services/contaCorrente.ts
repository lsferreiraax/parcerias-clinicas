import { supabase } from '@/lib/supabase'

export type TipoMovimentacao = 'credito' | 'debito'

export type CategoriaMovimentacao =
  | 'repasse'
  | 'aluguel_sala'
  | 'acordo'
  | 'estorno'
  | 'outro'

export type StatusMovimentacao = 'pendente' | 'liquidado' | 'cancelado'

export interface Movimentacao {
  id: string
  parceria_id: string
  tipo: TipoMovimentacao
  categoria: CategoriaMovimentacao
  valor: number
  descricao?: string
  referencia_id?: string
  competencia: string
  status: StatusMovimentacao
  criado_por?: string
  created_at: string
}

export interface SaldoParceria {
  parceria_id: string
  competencia: string
  total_credito: number
  total_debito: number
  saldo: number
}

export interface NovaMovimentacao {
  parceria_id: string
  tipo: TipoMovimentacao
  categoria: CategoriaMovimentacao
  valor: number
  descricao?: string
  referencia_id?: string
  competencia: string
}

export async function listarMovimentacoes(
  competencia?: string,
  parceria_id?: string
): Promise<Movimentacao[]> {
  let q = supabase
    .from('movimentacoes_parceria')
    .select('*')
    .order('created_at', { ascending: false })

  if (competencia) q = q.eq('competencia', competencia + '-01')
  if (parceria_id) q = q.eq('parceria_id', parceria_id)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function listarSaldos(competencia?: string): Promise<SaldoParceria[]> {
  let q = supabase
    .from('vw_saldo_parceria')
    .select('*')
    .order('parceria_id')

  if (competencia) q = q.eq('competencia', competencia + '-01')

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function criarMovimentacao(dados: NovaMovimentacao): Promise<void> {
  const { error } = await supabase.from('movimentacoes_parceria').insert({
    ...dados,
    competencia: dados.competencia + '-01',
  })
  if (error) throw error
}

export async function liquidarMovimentacao(id: string): Promise<void> {
  const { error } = await supabase
    .from('movimentacoes_parceria')
    .update({ status: 'liquidado' })
    .eq('id', id)
  if (error) throw error
}

export async function cancelarMovimentacao(id: string): Promise<void> {
  const { error } = await supabase
    .from('movimentacoes_parceria')
    .update({ status: 'cancelado' })
    .eq('id', id)
  if (error) throw error
}

export async function liquidarCompetencia(
  competencia: string,
  parceria_id?: string
): Promise<void> {
  let q = supabase
    .from('movimentacoes_parceria')
    .update({ status: 'liquidado' })
    .eq('competencia', competencia + '-01')
    .eq('status', 'pendente')

  if (parceria_id) q = q.eq('parceria_id', parceria_id)

  const { error } = await q
  if (error) throw error
}

const PARCERIA_LABEL: Record<string, string> = {
  camta:  'Camta',
  medico: 'Médico',
  psi1:   'Psi 1',
  psi2:   'Psi 2',
}

export function parceiraLabel(id: string): string {
  return PARCERIA_LABEL[id] ?? id
}

export interface LogMovimentacao {
  id: string
  movimentacao_id: string
  acao: string
  campo?: string
  valor_anterior?: string
  valor_novo?: string
  usuario_nome?: string
  created_at: string
}

export async function listarLog(movimentacao_id: string): Promise<LogMovimentacao[]> {
  const { data, error } = await supabase
    .from('movimentacoes_parceria_log')
    .select('*')
    .eq('movimentacao_id', movimentacao_id)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export const CATEGORIAS: { value: CategoriaMovimentacao; label: string }[] = [
  { value: 'repasse',      label: 'Repasse' },
  { value: 'aluguel_sala', label: 'Aluguel de Sala' },
  { value: 'acordo',       label: 'Acordo' },
  { value: 'estorno',      label: 'Estorno' },
  { value: 'outro',        label: 'Outro' },
]
