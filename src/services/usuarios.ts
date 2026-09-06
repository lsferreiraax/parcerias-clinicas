import { supabase } from '@/lib/supabase'
import type { Role, TipoProfissional, UserPerfil } from '@/contexts/PerfilContext'

export interface NovoUsuario {
  email: string
  nome: string
  role: Role
  tipo_profissional?: TipoProfissional
}

export async function listarUsuarios(): Promise<(UserPerfil & { email?: string })[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('nome')

  if (error) throw error
  return data as UserPerfil[]
}

export async function convidarUsuario(dados: NovoUsuario): Promise<void> {
  const { error } = await supabase.functions.invoke('criar-usuario', { body: dados })
  if (error) throw error
}

export async function atualizarPerfil(
  id: string,
  dados: Partial<Pick<UserPerfil, 'nome' | 'role' | 'tipo_profissional' | 'ativo'>>,
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update(dados)
    .eq('id', id)

  if (error) throw error
}
