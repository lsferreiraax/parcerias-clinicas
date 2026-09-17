import { supabase } from '@/lib/supabase'

export interface Paciente {
  id: string
  nome: string
  cpf?: string
  telefone?: string
  email?: string
  data_nasc?: string
  observacao?: string
  ativo: boolean
  origem_id?: string
  created_at: string
  updated_at: string
}

export interface NovoPaciente {
  nome: string
  cpf?: string
  telefone?: string
  email?: string
  data_nasc?: string
  observacao?: string
}

export async function listarPacientes(ativos = true): Promise<Paciente[]> {
  let q = supabase
    .from('pacientes')
    .select('*')
    .order('nome')

  if (ativos) q = q.eq('ativo', true)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function buscarPacientes(termo: string): Promise<Paciente[]> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .ilike('nome', `%${termo}%`)
    .eq('ativo', true)
    .limit(20)
    .order('nome')
  if (error) throw error
  return data ?? []
}

export async function obterPaciente(id: string): Promise<Paciente> {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function criarPaciente(dados: NovoPaciente): Promise<Paciente> {
  const { data, error } = await supabase
    .from('pacientes')
    .insert(dados)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarPaciente(
  id: string,
  dados: Partial<NovoPaciente>
): Promise<Paciente> {
  const { data, error } = await supabase
    .from('pacientes')
    .update(dados)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function desativarPaciente(id: string): Promise<void> {
  const { error } = await supabase
    .from('pacientes')
    .update({ ativo: false })
    .eq('id', id)
  if (error) throw error
}

export function formatarCPF(cpf: string): string {
  const n = cpf.replace(/\D/g, '')
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function formatarTelefone(tel: string): string {
  const n = tel.replace(/\D/g, '')
  if (n.length === 11) return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  return n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}
