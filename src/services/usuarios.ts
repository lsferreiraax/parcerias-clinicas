import { supabase } from '@/lib/supabase'
import type { Role, TipoProfissional, UserPerfil } from '@/contexts/PerfilContext'

export interface NovoUsuario {
  email: string
  nome: string
  role: Role
  tipo_profissional?: TipoProfissional
  perfil_id?: string
}

export interface UsuarioComPerfil extends UserPerfil {
  email?: string
  perfil_id?: string
  perfil_nome?: string
}

export async function listarUsuarios(): Promise<UsuarioComPerfil[]> {
  const { data, error } = await supabase.rpc('listar_perfis_com_email')
  if (error) throw error
  const usuarios = (data ?? []) as UsuarioComPerfil[]

  // Enriquecer com nome do perfil de acesso
  const perfilIds = [...new Set(usuarios.filter(u => u.perfil_id).map(u => u.perfil_id!))]
  if (perfilIds.length > 0) {
    const { data: perfis } = await supabase
      .from('perfis_acesso')
      .select('id, nome')
      .in('id', perfilIds)
    const map = new Map((perfis ?? []).map(p => [p.id, p.nome]))
    usuarios.forEach(u => { if (u.perfil_id) u.perfil_nome = map.get(u.perfil_id) })
  }
  return usuarios
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
