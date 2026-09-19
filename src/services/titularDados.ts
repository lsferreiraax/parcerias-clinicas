import { supabase } from '@/lib/supabase'
import { listarConsentimentos, listarAcessosProntuario } from './consentimentos'
import type { Paciente } from './pacientes'

export interface DadosTitular {
  paciente: Paciente
  consentimentos: Awaited<ReturnType<typeof listarConsentimentos>>
  prontuarios: unknown[]
  acessos: Awaited<ReturnType<typeof listarAcessosProntuario>>
}

export async function buscarDadosTitular(paciente_id: string): Promise<DadosTitular> {
  const [pacienteRes, consentimentos, prontuariosRes, acessos] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', paciente_id).single(),
    listarConsentimentos(paciente_id),
    supabase.schema('psicologia').from('prontuarios').select('id, tipo, data_registro, created_at').eq('paciente_id', paciente_id).order('data_registro', { ascending: false }),
    listarAcessosProntuario(paciente_id),
  ])

  if (pacienteRes.error) throw pacienteRes.error

  return {
    paciente: pacienteRes.data as Paciente,
    consentimentos,
    prontuarios: prontuariosRes.data ?? [],
    acessos,
  }
}

export function exportarDadosTitularJSON(dados: DadosTitular): void {
  const payload = {
    exportado_em: new Date().toISOString(),
    titular: {
      id: dados.paciente.id,
      nome: dados.paciente.nome,
      cpf: dados.paciente.cpf,
      email: dados.paciente.email,
      telefone: dados.paciente.telefone,
      data_nascimento: dados.paciente.data_nasc,
    },
    consentimentos: dados.consentimentos,
    prontuarios_resumo: dados.prontuarios,
    log_acessos: dados.acessos,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dados_titular_${dados.paciente.nome.replace(/\s+/g, '_').toLowerCase()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function anonimizarPaciente(paciente_id: string): Promise<void> {
  const { error } = await supabase
    .from('pacientes')
    .update({
      nome: '[Titular Anonimizado]',
      cpf: null,
      email: null,
      telefone: null,
      data_nasc: null,
      observacao: null,
      anonimizado: true,
      anonimizado_em: new Date().toISOString(),
    })
    .eq('id', paciente_id)
  if (error) throw error
}
