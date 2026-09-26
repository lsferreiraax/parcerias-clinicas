import { supabase } from '@/lib/supabase'

export type TipoSala = 'sala' | 'consultorio' | 'equipamento' | 'outro'

export interface Sala {
  id: string
  nome: string
  tipo: TipoSala
  descricao: string | null
  cor_hex: string
  capacidade: number
  horario_inicio: string
  horario_fim: string
  buffer_minutos: number
  ativo: boolean
  criado_por: string | null
  created_at: string
  updated_at: string
}

export interface NovaSala {
  nome: string
  tipo: TipoSala
  descricao?: string
  cor_hex: string
  capacidade: number
  horario_inicio: string
  horario_fim: string
  buffer_minutos: number
}

export const TIPOS_SALA: { value: TipoSala; label: string }[] = [
  { value: 'sala',        label: 'Sala de Atendimento' },
  { value: 'consultorio', label: 'Consultório'         },
  { value: 'equipamento', label: 'Equipamento'         },
  { value: 'outro',       label: 'Outro'               },
]

export const CORES_SALA = [
  { hex: '#6366f1', label: 'Índigo'   },
  { hex: '#0ea5e9', label: 'Azul'     },
  { hex: '#10b981', label: 'Verde'    },
  { hex: '#f59e0b', label: 'Âmbar'   },
  { hex: '#ef4444', label: 'Vermelho' },
  { hex: '#8b5cf6', label: 'Roxo'     },
  { hex: '#ec4899', label: 'Rosa'     },
  { hex: '#14b8a6', label: 'Teal'     },
]

export async function listarSalas(apenasAtivas = false): Promise<Sala[]> {
  let q = supabase
    .schema('psicologia')
    .from('salas')
    .select('*')
    .order('nome')

  if (apenasAtivas) q = q.eq('ativo', true)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Sala[]
}

export async function criarSala(dados: NovaSala): Promise<Sala> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .schema('psicologia')
    .from('salas')
    .insert({ ...dados, criado_por: user?.id })
    .select()
    .single()
  if (error) throw error
  return data as Sala
}

export async function atualizarSala(id: string, dados: Partial<NovaSala>): Promise<Sala> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('salas')
    .update(dados)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Sala
}

export async function alternarAtivoSala(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase
    .schema('psicologia')
    .from('salas')
    .update({ ativo })
    .eq('id', id)
  if (error) throw error
}

export async function excluirSala(id: string): Promise<void> {
  const { error } = await supabase
    .schema('psicologia')
    .from('salas')
    .delete()
    .eq('id', id)
  if (error) throw error
}
