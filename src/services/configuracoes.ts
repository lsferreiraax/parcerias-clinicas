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

export async function salvarParceria(id: string, patch: Partial<ParceriaCompleta>, original?: ParceriaCompleta) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('parcerias').update(patch).eq('id', id)
  if (error) throw error

  if (original) {
    const logs = (Object.entries(patch) as [keyof ParceriaCompleta, unknown][])
      .filter(([k, v]) => original[k] !== v)
      .map(([k, v]) => ({
        parceria_id:    id,
        campo_alterado: k as string,
        valor_anterior: String(original[k] ?? ''),
        valor_novo:     String(v ?? ''),
        alterado_por:   user?.id ?? null,
      }))
    if (logs.length > 0) {
      await supabase.from('parcerias_log').insert(logs)
    }
  }
}

export async function getLogParceria(parceriaId: string) {
  const { data, error } = await supabase
    .from('parcerias_log')
    .select('*')
    .eq('parceria_id', parceriaId)
    .order('alterado_em', { ascending: false })
  if (error) throw error
  return data as { id: string; campo_alterado: string; valor_anterior: string | null; valor_novo: string | null; alterado_em: string }[]
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
