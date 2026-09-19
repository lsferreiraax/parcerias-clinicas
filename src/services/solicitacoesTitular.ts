import { supabase } from '@/lib/supabase'

export type TipoSolicitacao = 'acesso' | 'portabilidade' | 'exclusao' | 'retificacao' | 'oposicao'
export type StatusSolicitacao = 'pendente' | 'em_analise' | 'concluido' | 'recusado'

export interface Solicitacao {
  id: string
  paciente_id: string
  tipo: TipoSolicitacao
  status: StatusSolicitacao
  descricao: string | null
  resposta: string | null
  respondido_por: string | null
  respondido_em: string | null
  prazo: string
  created_at: string
  updated_at: string
}

export interface NovaSolicitacao {
  paciente_id: string
  tipo: TipoSolicitacao
  descricao?: string
}

export interface PoliticaRetencao {
  id: string
  tipo_dado: string
  prazo_meses: number
  base_legal: string
  ativo: boolean
  updated_at: string
}

export const TIPOS_SOLICITACAO: { value: TipoSolicitacao; label: string; desc: string }[] = [
  { value: 'acesso',        label: 'Acesso',        desc: 'Confirmação e acesso aos dados tratados' },
  { value: 'portabilidade', label: 'Portabilidade', desc: 'Exportação dos dados em formato estruturado' },
  { value: 'exclusao',      label: 'Exclusão',      desc: 'Eliminação dos dados desnecessários ou excessivos' },
  { value: 'retificacao',   label: 'Retificação',   desc: 'Correção de dados incompletos ou desatualizados' },
  { value: 'oposicao',      label: 'Oposição',      desc: 'Oposição ao tratamento de dados pessoais' },
]

export const STATUS_SOLICITACAO: Record<StatusSolicitacao, { label: string; color: string }> = {
  pendente:    { label: 'Pendente',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  em_analise:  { label: 'Em análise',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  concluido:   { label: 'Concluído',   color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  recusado:    { label: 'Recusado',    color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
}

export async function listarSolicitacoes(paciente_id?: string): Promise<Solicitacao[]> {
  let q = supabase
    .from('solicitacoes_titular')
    .select('*')
    .order('created_at', { ascending: false })

  if (paciente_id) q = q.eq('paciente_id', paciente_id)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Solicitacao[]
}

export async function criarSolicitacao(dados: NovaSolicitacao): Promise<Solicitacao> {
  const { data, error } = await supabase
    .from('solicitacoes_titular')
    .insert(dados)
    .select()
    .single()
  if (error) throw error
  return data as Solicitacao
}

export async function responderSolicitacao(
  id: string,
  status: StatusSolicitacao,
  resposta: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { error } = await supabase
    .from('solicitacoes_titular')
    .update({
      status,
      resposta,
      respondido_por: user.id,
      respondido_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function listarPoliticasRetencao(): Promise<PoliticaRetencao[]> {
  const { data, error } = await supabase
    .from('politicas_retencao')
    .select('*')
    .order('tipo_dado')
  if (error) throw error
  return (data ?? []) as PoliticaRetencao[]
}

export async function atualizarPoliticaRetencao(
  id: string,
  prazo_meses: number,
): Promise<void> {
  const { error } = await supabase
    .from('politicas_retencao')
    .update({ prazo_meses, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
