import { supabase } from '@/lib/supabase'

export interface BloqueioSala {
  id: string
  sala_id: string
  titulo: string
  motivo: string | null
  data: string
  hora_inicio: string | null
  hora_fim: string | null
  dia_inteiro: boolean
  criado_por: string | null
  created_at: string
}

export interface NovoBloqueio {
  sala_id: string
  titulo: string
  motivo?: string
  data: string
  hora_inicio?: string
  hora_fim?: string
  dia_inteiro: boolean
}

export async function listarBloqueios(sala_id?: string): Promise<BloqueioSala[]> {
  let q = supabase
    .schema('psicologia')
    .from('bloqueios_sala')
    .select('*')
    .order('data', { ascending: false })
    .order('hora_inicio', { ascending: true })

  if (sala_id) q = q.eq('sala_id', sala_id)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as BloqueioSala[]
}

export async function criarBloqueio(dados: NovoBloqueio): Promise<BloqueioSala> {
  const { data: { user } } = await supabase.auth.getUser()
  const payload = {
    ...dados,
    criado_por: user?.id,
    hora_inicio: dados.dia_inteiro ? null : dados.hora_inicio,
    hora_fim: dados.dia_inteiro ? null : dados.hora_fim,
  }
  const { data, error } = await supabase
    .schema('psicologia')
    .from('bloqueios_sala')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data as BloqueioSala
}

export async function atualizarBloqueio(id: string, dados: Partial<NovoBloqueio>): Promise<BloqueioSala> {
  const payload = {
    ...dados,
    hora_inicio: dados.dia_inteiro ? null : dados.hora_inicio,
    hora_fim: dados.dia_inteiro ? null : dados.hora_fim,
  }
  const { data, error } = await supabase
    .schema('psicologia')
    .from('bloqueios_sala')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as BloqueioSala
}

export async function excluirBloqueio(id: string): Promise<void> {
  const { error } = await supabase
    .schema('psicologia')
    .from('bloqueios_sala')
    .delete()
    .eq('id', id)
  if (error) throw error
}
