import { supabase } from '@/lib/supabase'

export type ModalidadeSessao = 'presencial' | 'online'
export type StatusSessao = 'agendada' | 'realizada' | 'cancelada' | 'faltou'

export interface Sessao {
  id: string
  paciente_id: string
  profissional_id?: string
  data_sessao: string
  hora_inicio: string
  hora_fim?: string
  modalidade: ModalidadeSessao
  status: StatusSessao
  valor_sessao?: number
  observacoes?: string
  criado_por?: string
  created_at: string
  updated_at: string
  // joins
  pacientes?: { nome: string }
  profissionais?: { nome: string; tipo: string }
}

export interface NovaSessao {
  paciente_id: string
  profissional_id?: string
  data_sessao: string
  hora_inicio: string
  hora_fim?: string
  modalidade: ModalidadeSessao
  status: StatusSessao
  valor_sessao?: number
  observacoes?: string
}

export const STATUS_SESSAO: { value: StatusSessao; label: string; cor: string }[] = [
  { value: 'agendada',   label: 'Agendada',   cor: 'blue'   },
  { value: 'realizada',  label: 'Realizada',  cor: 'green'  },
  { value: 'cancelada',  label: 'Cancelada',  cor: 'gray'   },
  { value: 'faltou',     label: 'Faltou',     cor: 'red'    },
]

export const MODALIDADE_SESSAO: { value: ModalidadeSessao; label: string }[] = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online',     label: 'Online'     },
]

export async function listarSessoes(
  dataInicio: string,
  dataFim: string,
  profissional_id?: string
): Promise<Sessao[]> {
  let q = supabase
    .schema('psicologia')
    .from('sessoes')
    .select('*, pacientes(nome), profissionais(nome, tipo)')
    .gte('data_sessao', dataInicio)
    .lte('data_sessao', dataFim)
    .order('data_sessao')
    .order('hora_inicio')

  if (profissional_id) q = q.eq('profissional_id', profissional_id)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function criarSessao(dados: NovaSessao): Promise<Sessao> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('sessoes')
    .insert(dados)
    .select('*, pacientes(nome), profissionais(nome, tipo)')
    .single()
  if (error) throw error
  return data
}

export async function atualizarSessao(id: string, dados: Partial<NovaSessao>): Promise<Sessao> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('sessoes')
    .update(dados)
    .eq('id', id)
    .select('*, pacientes(nome), profissionais(nome, tipo)')
    .single()
  if (error) throw error
  return data
}

export async function deletarSessao(id: string): Promise<void> {
  const { error } = await supabase
    .schema('psicologia')
    .from('sessoes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Retorna segunda e domingo da semana que contém `data`
export function semanaDeData(data: Date): { inicio: Date; fim: Date } {
  const d = new Date(data)
  const dow = d.getDay() // 0=dom
  const inicio = new Date(d)
  inicio.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date(inicio)
  fim.setDate(inicio.getDate() + 6)
  fim.setHours(23, 59, 59, 999)
  return { inicio, fim }
}

export function formatarData(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function diasDaSemana(inicio: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    return d
  })
}
