import { supabase } from '@/lib/supabase'
import type { Role, TipoProfissional, UserPerfil } from '@/contexts/PerfilContext'

export interface NovoUsuario {
  email: string
  nome: string
  role: Role
  tipo_profissional?: TipoProfissional
  perfil_id?: string
  profissional_id?: string
  /** 'convidar' (e-mail de convite) ou 'cadastrar' (senha inicial definida pelo admin) */
  acao?: 'convidar' | 'cadastrar'
  senha?: string
}

export interface UsuarioComPerfil extends UserPerfil {
  email?: string
  perfil_id?: string
  perfil_nome?: string
  profissional_id?: string | null
  convite_pendente?: boolean
  ultimo_login?: string | null
}

/** Chama uma Edge Function e devolve a mensagem de erro real do corpo da resposta (functions.invoke a esconde). */
async function invocar<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body })
  if (error) {
    let msg = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const j = await ctx.json()
        if (j?.error) msg = j.error
      } catch { /* mantém a mensagem genérica */ }
    }
    throw new Error(msg)
  }
  return data as T
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

/** Convite por e-mail ou cadastro manual (conforme `acao`); a função cria login + perfil de forma atômica. */
export async function criarUsuario(dados: NovoUsuario): Promise<void> {
  await invocar('criar-usuario', { acao: 'convidar', ...dados })
}

export async function reenviarConvite(id: string): Promise<void> {
  await invocar('criar-usuario', { acao: 'reenviar_convite', id })
}

/** Admin define uma senha temporária; o usuário é obrigado a trocá-la no próximo acesso. */
export async function redefinirSenhaUsuario(id: string, novaSenha: string): Promise<void> {
  await invocar('criar-usuario', { acao: 'redefinir_senha', id, nova_senha: novaSenha })
}

/** Troca de senha do próprio usuário (troca obrigatória); limpa a marca no servidor. */
export async function trocarMinhaSenha(novaSenha: string): Promise<void> {
  await invocar('trocar-senha', { nova_senha: novaSenha })
  const { error } = await supabase.auth.refreshSession()
  if (error) throw new Error('Senha alterada, mas não foi possível renovar a sessão. Saia e entre novamente com a nova senha.')
}

/** Gera uma senha forte (letras, números e símbolos) para o admin copiar. */
export function gerarSenha(tamanho = 14): string {
  const letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'
  const numeros = '23456789'
  const todos = letras + numeros + '#$%&*+-?'
  const sorteio = (conj: string) => conj[crypto.getRandomValues(new Uint32Array(1))[0] % conj.length]
  const chars = [sorteio(letras), sorteio(letras), sorteio(numeros), sorteio(numeros)]
  while (chars.length < tamanho) chars.push(sorteio(todos))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export const senhaValida = (s: string) => s.length >= 10 && /[A-Za-z]/.test(s) && /\d/.test(s)

export async function atualizarPerfil(
  id: string,
  dados: Partial<Pick<UserPerfil, 'nome' | 'role' | 'tipo_profissional' | 'profissional_id' | 'ativo'>>,
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update(dados)
    .eq('id', id)

  if (error) throw error
}
