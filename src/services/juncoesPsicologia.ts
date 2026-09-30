import { supabase } from '@/lib/supabase'

// pacientes e profissionais ficam em `public` e as tabelas de psicologia em outro schema;
// o PostgREST não resolve embed entre schemas (PGRST200), então a junção é feita aqui.

type Id = string | null | undefined

function unicos(ids: Id[]): string[] {
  return [...new Set(ids.filter((i): i is string => !!i))]
}

export async function nomesPacientes(ids: Id[]): Promise<Map<string, { nome: string }>> {
  const lista = unicos(ids)
  const mapa = new Map<string, { nome: string }>()
  if (lista.length === 0) return mapa
  const { data, error } = await supabase.from('pacientes').select('id, nome').in('id', lista)
  if (error) throw error
  for (const p of data ?? []) mapa.set(p.id, { nome: p.nome })
  return mapa
}

export async function nomesProfissionais(ids: Id[]): Promise<Map<string, { nome: string; tipo: string }>> {
  const lista = unicos(ids)
  const mapa = new Map<string, { nome: string; tipo: string }>()
  if (lista.length === 0) return mapa
  const { data, error } = await supabase.from('profissionais').select('id, nome, tipo').in('id', lista)
  if (error) throw error
  for (const p of data ?? []) mapa.set(p.id, { nome: p.nome, tipo: p.tipo })
  return mapa
}

type ComPaciente = { paciente_id?: Id }
type ComProfissional = { profissional_id?: Id }

export async function anexarPacientes<T extends ComPaciente>(rows: T[]) {
  const pacientes = await nomesPacientes(rows.map(r => r.paciente_id))
  return rows.map(r => ({ ...r, pacientes: r.paciente_id ? pacientes.get(r.paciente_id) : undefined }))
}

export async function anexarPacientesEProfissionais<T extends ComPaciente & ComProfissional>(rows: T[]) {
  const [pacientes, profissionais] = await Promise.all([
    nomesPacientes(rows.map(r => r.paciente_id)),
    nomesProfissionais(rows.map(r => r.profissional_id)),
  ])
  return rows.map(r => ({
    ...r,
    pacientes: r.paciente_id ? pacientes.get(r.paciente_id) : undefined,
    profissionais: r.profissional_id ? profissionais.get(r.profissional_id) : undefined,
  }))
}
