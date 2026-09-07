import { supabase } from '@/lib/supabase'
import type { Configuracao, ParceriaCompleta, Profissional } from '@/types'

// ── Configurações ──────────────────────────────────────────────────────

export async function getConfiguracoes(): Promise<Configuracao> {
  const { data, error } = await supabase.from('configuracoes').select('*').single()
  if (error) throw error
  return data as Configuracao
}

export async function salvarConfiguracoes(patch: Partial<Omit<Configuracao, 'id' | 'updated_at'>>) {
  const { error } = await supabase.from('configuracoes').update(patch).eq('id', 1)
  if (error) throw error
}

// ── Parcerias ──────────────────────────────────────────────────────────

export async function listarParcerias(): Promise<ParceriaCompleta[]> {
  const { data, error } = await supabase
    .from('parcerias')
    .select('*')
    .order('id')
  if (error) throw error
  return data as ParceriaCompleta[]
}

export async function salvarParceria(id: string, patch: Partial<ParceriaCompleta>) {
  const { error } = await supabase.from('parcerias').update(patch).eq('id', id)
  if (error) throw error
}

export async function criarParceria(parceria: Omit<ParceriaCompleta, 'ativo'>) {
  const { error } = await supabase
    .from('parcerias')
    .insert({ ...parceria, ativo: true })
  if (error) throw error
}

// ── Profissionais ──────────────────────────────────────────────────────

export async function listarProfissionais(): Promise<Profissional[]> {
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .order('nome')
  if (error) throw error
  return data as Profissional[]
}

export async function salvarProfissional(id: string, patch: Partial<Profissional>) {
  const { error } = await supabase.from('profissionais').update(patch).eq('id', id)
  if (error) throw error
}
