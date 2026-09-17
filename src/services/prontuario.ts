import { supabase } from '@/lib/supabase'

export type TipoProntuario = 'anamnese' | 'evolucao' | 'alta' | 'outro'

export const TIPO_PRONTUARIO: { value: TipoProntuario; label: string; cor: string }[] = [
  { value: 'anamnese',  label: 'Anamnese',   cor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { value: 'evolucao',  label: 'Evolução',   cor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'alta',      label: 'Alta',       cor: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'outro',     label: 'Outro',      cor: 'bg-gray-100 text-gray-600 dark:bg-gray-700/40 dark:text-gray-300' },
]

export interface Prontuario {
  id: string
  paciente_id: string
  sessao_id: string | null
  data_registro: string
  tipo: TipoProntuario
  queixa_principal: string | null
  historico: string | null
  avaliacao: string | null
  plano_terapeutico: string | null
  cid10: string | null
  criado_por: string
  created_at: string
  updated_at: string
  paciente?: { nome: string }
}

export interface NovoProntuario {
  paciente_id: string
  sessao_id?: string | null
  data_registro: string
  tipo: TipoProntuario
  queixa_principal?: string
  historico?: string
  avaliacao?: string
  plano_terapeutico?: string
  cid10?: string
}

export async function listarProntuarios(paciente_id?: string): Promise<Prontuario[]> {
  let q = supabase
    .schema('psicologia')
    .from('prontuarios')
    .select('*, paciente:pacientes(nome)')
    .order('data_registro', { ascending: false })
    .order('created_at', { ascending: false })

  if (paciente_id) q = q.eq('paciente_id', paciente_id)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Prontuario[]
}

export async function obterProntuario(id: string): Promise<Prontuario> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('prontuarios')
    .select('*, paciente:pacientes(nome)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Prontuario
}

export async function criarProntuario(dados: NovoProntuario & { criado_por: string }): Promise<Prontuario> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('prontuarios')
    .insert(dados)
    .select()
    .single()
  if (error) throw error
  return data as Prontuario
}

export async function atualizarProntuario(id: string, dados: Partial<NovoProntuario>): Promise<Prontuario> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('prontuarios')
    .update(dados)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Prontuario
}

export async function deletarProntuario(id: string): Promise<void> {
  const { error } = await supabase
    .schema('psicologia')
    .from('prontuarios')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export function formatarDataProntuario(data: string): string {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function labelTipo(tipo: TipoProntuario): string {
  return TIPO_PRONTUARIO.find(t => t.value === tipo)?.label ?? tipo
}

export function corTipo(tipo: TipoProntuario): string {
  return TIPO_PRONTUARIO.find(t => t.value === tipo)?.cor ?? ''
}
