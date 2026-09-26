import { supabase } from '@/lib/supabase'
import type { Modulo } from '@/contexts/PermissoesContext'

export interface PerfilAcesso {
  id: string
  nome: string
  descricao: string | null
  protegido: boolean
  criado_em: string
  atualizado_em: string
}

export interface PermissaoItem {
  id: string
  perfil_id: string
  modulo: Modulo
  pode_ver: boolean
  pode_editar: boolean
}

export interface PerfilAcessoLog {
  id: string
  usuario_id: string
  alterado_por: string
  perfil_anterior: string | null
  perfil_novo: string | null
  criado_em: string
}

export const MODULOS: Modulo[] = [
  'parcerias', 'psicologia', 'salas', 'condominio',
  'conta_corrente', 'relatorios', 'usuarios', 'configuracoes',
]

export const MODULO_LABEL: Record<Modulo, string> = {
  parcerias:      'Parcerias',
  psicologia:     'Psicologia',
  salas:          'Salas',
  condominio:     'Condomínio',
  conta_corrente: 'Conta Corrente',
  relatorios:     'Relatórios',
  usuarios:       'Usuários',
  configuracoes:  'Configurações',
}

export async function listarPerfis(): Promise<PerfilAcesso[]> {
  const { data, error } = await supabase
    .from('perfis_acesso')
    .select('*')
    .order('nome')
  if (error) throw new Error(error.message)
  return data as PerfilAcesso[]
}

export async function buscarPermissoes(perfilId: string): Promise<PermissaoItem[]> {
  const { data, error } = await supabase
    .from('perfil_permissoes')
    .select('*')
    .eq('perfil_id', perfilId)
  if (error) throw new Error(error.message)
  return data as PermissaoItem[]
}

export async function criarPerfil(nome: string, descricao: string): Promise<PerfilAcesso> {
  const { data, error } = await supabase
    .from('perfis_acesso')
    .insert({ nome, descricao })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as PerfilAcesso
}

export async function atualizarPerfil(id: string, dados: Partial<Pick<PerfilAcesso, 'nome' | 'descricao'>>): Promise<void> {
  const { error } = await supabase
    .from('perfis_acesso')
    .update(dados)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirPerfil(id: string): Promise<void> {
  const { error } = await supabase
    .from('perfis_acesso')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function salvarPermissoes(
  perfilId: string,
  permissoes: { modulo: Modulo; pode_ver: boolean; pode_editar: boolean }[],
): Promise<void> {
  // Upsert completo: substitui todas as permissões do perfil
  const rows = permissoes.map(p => ({ perfil_id: perfilId, ...p }))
  const { error } = await supabase
    .from('perfil_permissoes')
    .upsert(rows, { onConflict: 'perfil_id,modulo' })
  if (error) throw new Error(error.message)
}

export async function atribuirPerfilUsuario(
  usuarioId: string,
  perfilId: string,
  alteradoPor: string,
  perfilAnterior: string | null,
): Promise<void> {
  // Registra log
  await supabase.from('perfil_acesso_log').insert({
    usuario_id:      usuarioId,
    alterado_por:    alteradoPor,
    perfil_anterior: perfilAnterior,
    perfil_novo:     perfilId,
  })

  const { error } = await supabase
    .from('user_profiles')
    .update({ perfil_id: perfilId })
    .eq('id', usuarioId)
  if (error) throw new Error(error.message)
}

export async function listarLog(): Promise<PerfilAcessoLog[]> {
  const { data, error } = await supabase
    .from('perfil_acesso_log')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return data as PerfilAcessoLog[]
}
