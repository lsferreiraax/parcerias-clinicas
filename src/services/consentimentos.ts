import { supabase } from '@/lib/supabase'

export type TipoConsentimento = 'prontuario' | 'pesquisa' | 'comunicacao' | 'geral'
export type AcaoProntuario = 'visualizou' | 'criou' | 'editou' | 'exportou'

export interface Consentimento {
  id: string
  paciente_id: string
  tipo: TipoConsentimento
  versao: string
  aceito: boolean
  aceito_em: string
  revogado: boolean
  revogado_em: string | null
  revogado_por: string | null
  registrado_por: string
  observacao: string | null
  created_at: string
}

export interface NovoConsentimento {
  paciente_id: string
  tipo: TipoConsentimento
  versao?: string
  aceito?: boolean
  observacao?: string
}

export interface AcessoProntuario {
  id: string
  prontuario_id: string | null
  paciente_id: string
  usuario_id: string
  acao: AcaoProntuario
  acessado_em: string
  detalhes: Record<string, unknown> | null
}

export async function listarConsentimentos(paciente_id: string): Promise<Consentimento[]> {
  const { data, error } = await supabase
    .from('consentimentos')
    .select('*')
    .eq('paciente_id', paciente_id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Consentimento[]
}

export async function registrarConsentimento(dados: NovoConsentimento): Promise<Consentimento> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('consentimentos')
    .insert({ ...dados, registrado_por: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Consentimento
}

export async function revogarConsentimento(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { error } = await supabase
    .from('consentimentos')
    .update({ revogado: true, revogado_em: new Date().toISOString(), revogado_por: user.id })
    .eq('id', id)
  if (error) throw error
}

export async function registrarAcessoProntuario(
  paciente_id: string,
  acao: AcaoProntuario,
  prontuario_id?: string | null,
  detalhes?: Record<string, unknown>,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .schema('psicologia')
    .from('prontuario_acessos')
    .insert({
      paciente_id,
      usuario_id: user.id,
      acao,
      prontuario_id: prontuario_id ?? null,
      detalhes: detalhes ?? null,
    })
}

export async function listarAcessosProntuario(paciente_id: string): Promise<AcessoProntuario[]> {
  const { data, error } = await supabase
    .schema('psicologia')
    .from('prontuario_acessos')
    .select('*')
    .eq('paciente_id', paciente_id)
    .order('acessado_em', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as AcessoProntuario[]
}
